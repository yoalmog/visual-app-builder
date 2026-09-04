import { AppPage } from '../schema/page';
import { ComponentNode } from '../schema/component';
import { cloneNodeWithNewIds } from './duplicate-node';

export function normalizeSlug(rawSlug: string, existingPages: AppPage[] = [], currentId?: string): string {
  let cleaned = rawSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_/]/g, '')
    .replace(/\/+/g, '/');

  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  while (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/-+/g, '-').replace(/\/-/g, '/').replace(/-\//g, '/');

  // Deduplicate
  let finalSlug = cleaned;
  let counter = 1;
  while (existingPages.some((p) => p.id !== currentId && p.slug === finalSlug)) {
    finalSlug = `${cleaned}-${counter}`;
    counter++;
  }

  return finalSlug;
}

export function createNewPage(name: string, slug?: string, existingPages: AppPage[] = []): AppPage {
  const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const rootId = `root_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const finalSlug = normalizeSlug(slug || (existingPages.length === 0 ? '/' : name), existingPages);

  const rootContainer: ComponentNode = {
    id: rootId,
    type: 'container',
    name: 'Container',
    props: {},
    styles: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '400px',
      padding: '32px',
      gap: '16px',
      backgroundColor: '#FFFFFF',
    },
    children: [],
  };

  return {
    id: pageId,
    name: name.trim() || 'New Page',
    slug: finalSlug,
    root: rootContainer,
  };
}

export function duplicatePage(sourcePage: AppPage, existingPages: AppPage[] = []): AppPage {
  const newPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newSlug = normalizeSlug(`${sourcePage.slug}-copy`, existingPages);
  const clonedRoot = cloneNodeWithNewIds(sourcePage.root);

  return {
    id: newPageId,
    name: `${sourcePage.name} Copy`,
    slug: newSlug,
    root: clonedRoot,
  };
}
