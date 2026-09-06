'use client';

import React, { useState } from 'react';
import { usePlatformStore } from '@/builder/state/platform-store';
import { useBuilderStore } from '@/builder/state/builder-store';
import { defaultVersionControlProvider } from '@/builder/platform/version-control/VersionControlProvider';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  Plus,
  GitMerge,
  Send,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export const VersionControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'commits' | 'branches' | 'reviews' | 'diff'>('commits');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  const project = useBuilderStore((s) => s.project);
  const currentBranch = usePlatformStore((s) => s.currentBranch);
  const branches = usePlatformStore((s) => s.branches);
  const commits = usePlatformStore((s) => s.commits);
  const reviews = usePlatformStore((s) => s.reviews);
  const switchBranch = usePlatformStore((s) => s.switchBranch);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    setIsCommitting(true);
    try {
      await defaultVersionControlProvider.commit({
        projectId: project.id,
        branchName: currentBranch,
        message: commitMessage.trim(),
        authorId: 'user_admin',
        authorName: 'Apex Admin',
        snapshot: project,
      });

      setCommitMessage('');
      // Refresh commits
      const updatedCommits = await defaultVersionControlProvider.listCommits(project.id, currentBranch);
      usePlatformStore.setState({ commits: updatedCommits });
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim()) return;

    try {
      const review = await defaultVersionControlProvider.requestReview({
        projectId: project.id,
        orgId: 'org_default',
        authorId: 'user_admin',
        authorName: 'Apex Admin',
        sourceBranch: currentBranch,
        targetBranch: 'main',
        title: reviewTitle.trim(),
        description: `Review changes from ${currentBranch} into main`,
        reviewers: ['user_admin'],
      });

      setReviewTitle('');
      const updatedReviews = await defaultVersionControlProvider.listReviews(project.id);
      usePlatformStore.setState({ reviews: updatedReviews });
    } catch (err: any) {
      alert(`Review request failed: ${err.message}`);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      await defaultVersionControlProvider.submitReviewDecision({
        reviewId,
        orgId: 'org_default',
        reviewerId: 'user_admin',
        decision: 'approved',
      });
      const updatedReviews = await defaultVersionControlProvider.listReviews(project.id);
      usePlatformStore.setState({ reviews: updatedReviews });
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleMerge = async (sourceBranch: string, targetBranch: string) => {
    try {
      const res = await defaultVersionControlProvider.merge({
        projectId: project.id,
        sourceBranchName: sourceBranch,
        targetBranchName: targetBranch,
        authorId: 'user_admin',
        authorName: 'Apex Admin',
      });

      if (res.success) {
        setMergeMessage(`Merged ${sourceBranch} into ${targetBranch} successfully!`);
        setTimeout(() => setMergeMessage(null), 4000);
      }
    } catch (err: any) {
      alert(`Merge failed: ${err.message}`);
    }
  };

  return (
    <div
      data-testid="version-control-panel"
      className="w-80 h-full bg-[#0C0E15] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none text-xs"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-[#1A1F2E] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          <span>Version Control</span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {currentBranch}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1A1F2E] bg-[#0E111B] text-[11px]">
        <button
          onClick={() => setActiveTab('commits')}
          className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'commits'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Commits
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'branches'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Branches
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'reviews'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Reviews
        </button>
      </div>

      {/* Commit Box */}
      <form onSubmit={handleCommit} className="p-3 border-b border-[#1A1F2E] bg-[#111420]">
        <div className="text-[11px] font-semibold text-slate-300 mb-1">Commit Current State</div>
        <input
          type="text"
          placeholder="Commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          className="w-full bg-[#161B28] border border-[#23293D] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 mb-2"
        />
        <button
          type="submit"
          disabled={!commitMessage.trim() || isCommitting}
          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>{isCommitting ? 'Committing...' : 'Commit to ' + currentBranch}</span>
        </button>
      </form>

      {mergeMessage && (
        <div className="p-2 bg-emerald-500/10 text-emerald-400 text-[11px] border-b border-emerald-500/20 text-center font-semibold">
          {mergeMessage}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'commits' && (
          <div className="space-y-2">
            {commits.map((c) => (
              <div
                key={c.id}
                data-testid={`commit-item-${c.id}`}
                className="p-2.5 rounded-xl bg-[#121622] border border-[#202638] flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate max-w-[180px]">{c.message}</span>
                  <span className="text-[10px] font-mono text-slate-500">{c.id.slice(-6)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{c.authorName}</span>
                  <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            {commits.length === 0 && (
              <div className="h-32 flex items-center justify-center text-slate-500 text-center">
                No commits yet
              </div>
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-2">
            {branches.map((b) => (
              <div
                key={b.name}
                data-testid={`branch-item-${b.name}`}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  b.name === currentBranch ? 'bg-[#151929] border-indigo-500/40' : 'bg-[#121622] border-[#202638]'
                }`}
              >
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>{b.name}</span>
                    {b.protected && (
                      <span className="text-[9px] px-1 bg-amber-500/10 text-amber-400 rounded">protected</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">Head: {b.headCommitId?.slice(-6) || 'None'}</div>
                </div>

                <div className="flex items-center gap-1">
                  {b.name !== currentBranch && (
                    <button
                      onClick={() => switchBranch(b.name)}
                      className="px-2 py-1 bg-[#1A1F30] hover:bg-[#252D45] text-slate-200 rounded text-[10px] font-semibold"
                    >
                      Checkout
                    </button>
                  )}
                  {b.name !== 'main' && (
                    <button
                      onClick={() => handleMerge(b.name, 'main')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Merge into main"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {/* Request Review Form */}
            {currentBranch !== 'main' && (
              <form onSubmit={handleCreateReview} className="p-2.5 rounded-xl bg-[#141826] border border-[#232A3E]">
                <div className="text-[11px] font-semibold text-slate-200 mb-1.5 flex items-center gap-1">
                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Request Review to main</span>
                </div>
                <input
                  type="text"
                  placeholder="Review title..."
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-[#181D2E] border border-[#2B334C] rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 outline-none mb-2"
                />
                <button
                  type="submit"
                  disabled={!reviewTitle.trim()}
                  className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded font-semibold text-[11px]"
                >
                  Create Review Request
                </button>
              </form>
            )}

            {reviews.map((r) => (
              <div
                key={r.id}
                data-testid={`review-item-${r.id}`}
                className="p-2.5 rounded-xl bg-[#121622] border border-[#202638] space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{r.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {r.sourceBranch} → {r.targetBranch}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      r.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : r.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                {r.status === 'review_requested' && (
                  <div className="pt-1.5 border-t border-[#1C2234] flex gap-1.5">
                    <button
                      onClick={() => handleApproveReview(r.id)}
                      className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
