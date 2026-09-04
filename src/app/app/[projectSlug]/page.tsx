'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppProject } from '@/builder/schema/project';
import { useRuntimeStore } from '@/builder/runtime/runtime-store';
import { ComponentRenderer } from '@/components/builder/ComponentRenderer';
import { loadProjectFromStorage } from '@/builder/persistence/project-storage';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PublishedAppPage() {
  const params = useParams();
  const projectSlug = (params?.projectSlug as string) || '';

  const [project, setProject] = useState<AppProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runtime Store State
  const runtimeActivePageId = useRuntimeStore((s) => s.navigation.activePageId);
  const initRuntime = useRuntimeStore((s) => s.initRuntime);
  const navigate = useRuntimeStore((s) => s.navigate);
  const currentUser = useRuntimeStore((s) => s.currentUser);

  useEffect(() => {
    async function loadPublishedApp() {
      try {
        setLoading(true);
        setError(null);

        // 1. Try to fetch published deployment from backend API
        const res = await fetch(`/api/deployments?projectId=${encodeURIComponent(projectSlug)}&environment=production`);
        if (res.ok) {
          const data = await res.json();
          if (data.activeDeployment?.snapshot) {
            setProject(data.activeDeployment.snapshot);
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to local storage (for previewing local projects as published)
        const local = loadProjectFromStorage(projectSlug);
        if (local) {
          setProject(local);
          setLoading(false);
          return;
        }

        setError(`Application "${projectSlug}" not found or has no published releases.`);
      } catch (err: any) {
        setError(err.message || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    }

    if (projectSlug) {
      loadPublishedApp();
    }
  }, [projectSlug]);

  // Initialize runtime when project is loaded
  useEffect(() => {
    if (project) {
      const initialPageId = project.pages[0]?.id;
      initRuntime(project, initialPageId);
    }
  }, [project, initRuntime]);

  // Determine active page
  const activePage = useMemo(() => {
    if (!project || !project.pages.length) return null;
    return project.pages.find((p) => p.id === runtimeActivePageId) || project.pages[0];
  }, [project, runtimeActivePageId]);

  // Evaluate Auth Protection
  useEffect(() => {
    if (!activePage || !project) return;

    const protection = activePage.authProtection;
    const requireAuth =
      typeof protection === 'string'
        ? protection === 'authenticated'
        : Boolean(protection?.requireAuth);

    if (requireAuth && !currentUser) {
      const authConfig = project.authConfig;
      const targetPageId =
        (typeof protection === 'object' && protection?.redirectTo) ||
        activePage.unauthorizedRedirectPageId ||
        authConfig?.loginPageId ||
        project.pages.find((p) => p.slug === '/login' || p.name.toLowerCase() === 'login')?.id;

      if (targetPageId && targetPageId !== activePage.id) {
        navigate(targetPageId);
      }
    }
  }, [activePage, currentUser, project, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading published application...</p>
      </div>
    );
  }

  if (error || !project || !activePage) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-4 border border-red-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Application Unavailable</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || 'Page could not be loaded.'}</p>
        <a
          href="/"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Return to Builder
        </a>
      </div>
    );
  }

  return (
    <div
      data-testid="published-app-container"
      className="min-h-screen w-full bg-white text-slate-900"
      style={{
        backgroundColor: project.theme?.backgroundColor || '#FFFFFF',
        color: project.theme?.textColor || '#0F172A',
      }}
    >
      <ComponentRenderer node={activePage.root} isPreview={true} />
    </div>
  );
}
