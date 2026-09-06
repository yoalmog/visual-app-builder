// D8.2: Context Intelligence Engine
// Intelligently selects, ranks, compresses, and tracks provenance of project context.
// Governed by the OBSERVE -> PLAN -> VERIFY -> ACT -> MEASURE -> ADAPT cycle.
// Ensures strict token budget compliance and prevents duplicate entity proposals.

import { AppProject } from '../../builder/schema/project';
import { ComponentNode } from '../../builder/schema/component';
import {
  GoalRepresentation,
  IntelligentContextItem,
  RankedProjectContext,
  ContextCategory,
} from './types';

export class ContextIntelligenceEngine {
  public static readonly DEFAULT_MAX_TOKENS = 4000;

  /**
   * Builds an intelligently ranked, bounded, and compressed project context.
   * Pure inspection: NEVER mutates project state.
   */
  public static buildIntelligentContext(
    project: AppProject,
    goal: GoalRepresentation,
    maxTokens: number = this.DEFAULT_MAX_TOKENS
  ): RankedProjectContext {
    const rawItems: IntelligentContextItem[] = [];
    const targetEntities = (goal.targetEntities || []).map((e) => e.toLowerCase());

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PAGES & ROUTING CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    for (const page of project.pages || []) {
      const pageNameLower = (page.name || '').toLowerCase();
      const pageSlugLower = (page.slug || '').toLowerCase();
      const isHome = page.slug === '/' || (page as any).isHome;
      const isDirectMatch = targetEntities.some(
        (e) => pageNameLower.includes(e) || pageSlugLower.includes(e)
      );

      const totalNodes = this.countNodes(page.root);
      const compressedTree = this.compressComponentNode(page.root, 0, 3);
      const content = JSON.stringify({
        id: page.id,
        name: page.name,
        slug: page.slug,
        nodeCount: totalNodes,
        structure: compressedTree,
      });

      let priority = 3;
      let relevanceScore = 0.4;

      if (isDirectMatch) {
        priority = 1;
        relevanceScore = 0.95;
      } else if (isHome) {
        priority = 2;
        relevanceScore = 0.9;
      }

      rawItems.push({
        id: `ctx_page_${page.id}`,
        rawEntityId: page.id,
        source: `project.pages[${page.id}]`,
        category: 'page',
        priority,
        relevanceScore,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'ast_compression',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DATA COLLECTIONS CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    for (const col of project.collections || []) {
      const colNameLower = (col.name || '').toLowerCase();
      const isDirectMatch = targetEntities.some(
        (e) => colNameLower.includes(e) || e.includes(colNameLower)
      );

      const fieldsSummary = (col.fields || []).map((f) => ({
        name: f.name,
        type: f.type,
        required: f.required,
      }));

      const relationshipsSummary = (col.relationships || []).map((r) => ({
        name: r.name,
        type: r.type,
        targetCollectionId: r.targetCollectionId,
      }));

      const content = JSON.stringify({
        id: col.id,
        name: col.name,
        fields: fieldsSummary,
        relationships: relationshipsSummary,
        recordCount: col.records?.length || 0,
      });

      rawItems.push({
        id: `ctx_col_${col.id}`,
        rawEntityId: col.id,
        source: `project.collections[${col.id}]`,
        category: 'collection',
        priority: isDirectMatch ? 1 : 2,
        relevanceScore: isDirectMatch ? 0.92 : 0.5,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'schema_summary',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. WORKFLOWS & AUTOMATION CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    for (const wf of project.workflows || []) {
      const wfNameLower = (wf.name || '').toLowerCase();
      const isDirectMatch = targetEntities.some((e) => wfNameLower.includes(e));
      const content = JSON.stringify({
        id: wf.id,
        name: wf.name,
        triggerType: wf.triggerType || 'manual',
        nodeCount: wf.nodes?.length || 0,
      });

      rawItems.push({
        id: `ctx_wf_${wf.id}`,
        rawEntityId: wf.id,
        source: `project.workflows[${wf.id}]`,
        category: 'workflow',
        priority: isDirectMatch ? 1 : 3,
        relevanceScore: isDirectMatch ? 0.88 : 0.5,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'workflow_summary',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. DESIGN THEME & TOKENS CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    if (project.tokens && project.tokens.length > 0) {
      const tokenSample = project.tokens.slice(0, 10).map((t) => ({
        name: t.name,
        category: t.category,
        value: t.value,
      }));
      const content = JSON.stringify({
        totalTokens: project.tokens.length,
        palette: tokenSample,
      });

      rawItems.push({
        id: 'ctx_tokens',
        source: 'project.tokens',
        category: 'theme',
        priority: 2,
        relevanceScore: 0.7,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'theme_token_sample',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. QUERIES & APIS CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    for (const query of project.queries || []) {
      const qNameLower = (query.name || '').toLowerCase();
      const isDirectMatch = targetEntities.some((e) => qNameLower.includes(e));
      const content = JSON.stringify({
        id: query.id,
        name: query.name,
        sourceCollectionId: query.sourceCollectionId,
        hasFilters: Boolean(query.filterGroup || (query.filters && query.filters.length > 0)),
        hasSort: Boolean(query.sort && query.sort.length > 0),
        aggregations: query.aggregations?.map((a) => `${a.function}(${a.field || '*'}`),
      });

      rawItems.push({
        id: `ctx_query_${query.id}`,
        rawEntityId: query.id,
        source: `project.queries[${query.id}]`,
        category: 'query',
        priority: isDirectMatch ? 1 : 3,
        relevanceScore: isDirectMatch ? 0.85 : 0.45,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'query_summary',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VARIABLES & REACTIVE STATE CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    for (const v of project.variables || []) {
      const content = JSON.stringify({
        id: v.id,
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
      });

      rawItems.push({
        id: `ctx_var_${v.id}`,
        rawEntityId: v.id,
        source: `project.variables[${v.id}]`,
        category: 'variable',
        priority: 3,
        relevanceScore: 0.45,
        content,
        tokenCount: this.estimateTokens(content),
        freshnessTimestamp: new Date().toISOString(),
        derivationMethod: 'variable_summary',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. MEMORY CONVENTIONS, PATTERNS & CONSTRAINTS
    // ─────────────────────────────────────────────────────────────────────────
    if (project.aiMetadata?.memory?.conventions) {
      project.aiMetadata.memory.conventions.forEach((conv, idx) => {
        rawItems.push({
          id: `ctx_conv_${idx}`,
          source: `project.aiMetadata.memory.conventions[${idx}]`,
          category: 'convention',
          priority: 1,
          relevanceScore: 0.85,
          content: conv,
          tokenCount: this.estimateTokens(conv),
          freshnessTimestamp: new Date().toISOString(),
          derivationMethod: 'memory_lookup',
        });
      });
    }

    if (project.aiMetadata?.memory?.notes) {
      project.aiMetadata.memory.notes.forEach((note, idx) => {
        rawItems.push({
          id: `ctx_note_${idx}`,
          source: `project.aiMetadata.memory.notes[${idx}]`,
          category: 'convention',
          priority: 2,
          relevanceScore: 0.75,
          content: note,
          tokenCount: this.estimateTokens(note),
          freshnessTimestamp: new Date().toISOString(),
          derivationMethod: 'memory_lookup',
        });
      });
    }

    const memAny = project.aiMetadata?.memory as any;
    if (memAny?.constraints && Array.isArray(memAny.constraints)) {
      memAny.constraints.forEach((c: string, idx: number) => {
        rawItems.push({
          id: `ctx_constraint_${idx}`,
          source: `project.aiMetadata.memory.constraints[${idx}]`,
          category: 'constraint',
          priority: 1,
          relevanceScore: 0.9,
          content: c,
          tokenCount: this.estimateTokens(c),
          freshnessTimestamp: new Date().toISOString(),
          derivationMethod: 'memory_lookup',
        });
      });
    }

    if (memAny?.approvedPatterns && Array.isArray(memAny.approvedPatterns)) {
      memAny.approvedPatterns.forEach((p: any, idx: number) => {
        const text = typeof p === 'string' ? p : `${p.name || ''}: ${p.description || ''}`;
        rawItems.push({
          id: `ctx_pattern_${idx}`,
          source: `project.aiMetadata.memory.approvedPatterns[${idx}]`,
          category: 'pattern',
          priority: 2,
          relevanceScore: 0.8,
          content: text,
          tokenCount: this.estimateTokens(text),
          freshnessTimestamp: new Date().toISOString(),
          derivationMethod: 'memory_lookup',
        });
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. RECENT GENERATION HISTORY CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    if (project.aiMetadata?.generations && project.aiMetadata.generations.length > 0) {
      const recentGens = project.aiMetadata.generations.slice(-2);
      for (const gen of recentGens) {
        const content = JSON.stringify({
          generationId: gen.id,
          prompt: gen.prompt,
          mode: gen.mode,
          timestamp: gen.timestamp,
        });

        rawItems.push({
          id: `ctx_gen_${gen.id}`,
          rawEntityId: gen.id,
          source: `project.aiMetadata.generations[${gen.id}]`,
          category: 'history',
          priority: 3,
          relevanceScore: 0.5,
          content,
          tokenCount: this.estimateTokens(content),
          freshnessTimestamp: gen.timestamp,
          derivationMethod: 'history_lookup',
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MULTI-FACTOR RANKING
    // ─────────────────────────────────────────────────────────────────────────
    // Sort items: Priority ascending (1 before 2), then relevance descending (0.95 before 0.5),
    // then token count ascending (more compact first).
    rawItems.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return a.tokenCount - b.tokenCount;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // BOUNDED TOKEN PRUNING
    // ─────────────────────────────────────────────────────────────────────────
    let currentTokens = 0;
    const selectedItems: IntelligentContextItem[] = [];
    let truncatedCount = 0;
    const categoriesIncluded: Record<string, number> = {};

    for (const item of rawItems) {
      if (currentTokens + item.tokenCount <= maxTokens) {
        selectedItems.push(item);
        currentTokens += item.tokenCount;
        categoriesIncluded[item.category] = (categoriesIncluded[item.category] || 0) + 1;
      } else {
        truncatedCount++;
      }
    }

    // Duplicate detection warnings
    const duplicateEntityWarnings = this.detectDuplicates(project, goal);

    // Format prompt context representation
    const formattedPromptContext = this.formatForPrompt(selectedItems);

    const summary = `Selected ${selectedItems.length} context items (${currentTokens} tokens) across [${Object.keys(
      categoriesIncluded
    ).join(', ')}]. Pruned ${truncatedCount} low-priority items to satisfy ${maxTokens} budget ceiling.`;

    return {
      items: selectedItems,
      totalTokens: currentTokens,
      truncatedCount,
      summary,
      categoriesIncluded,
      duplicateEntityWarnings,
      formattedPromptContext,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DUPLICATE DETECTION & PREVENTATIVE CHECKS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checks if an entity name already exists in project to avoid duplicate proposals.
   */
  public static entityExists(
    project: AppProject,
    type: 'page' | 'collection' | 'workflow' | 'component' | 'query' | 'variable',
    name: string
  ): boolean {
    const norm = name.toLowerCase().trim();

    if (type === 'page') {
      return (project.pages || []).some(
        (p) => p.name.toLowerCase() === norm || p.slug.toLowerCase() === `/${norm}` || p.slug.toLowerCase() === norm
      );
    }
    if (type === 'collection') {
      return (project.collections || []).some(
        (c) => c.name.toLowerCase() === norm || c.id.toLowerCase() === norm
      );
    }
    if (type === 'workflow') {
      return (project.workflows || []).some(
        (w) => w.name.toLowerCase() === norm || w.id.toLowerCase() === norm
      );
    }
    if (type === 'query') {
      return (project.queries || []).some(
        (q) => q.name.toLowerCase() === norm || q.id.toLowerCase() === norm
      );
    }
    if (type === 'variable') {
      return (project.variables || []).some(
        (v) => v.name.toLowerCase() === norm || v.id.toLowerCase() === norm
      );
    }
    if (type === 'component') {
      for (const p of project.pages || []) {
        if (this.nodeExistsByName(p.root, norm)) return true;
      }
      return false;
    }
    return false;
  }

  /**
   * Detects duplicate entities between a goal's requested entities and the existing project.
   */
  public static detectDuplicates(project: AppProject, goal: GoalRepresentation): string[] {
    const warnings: string[] = [];
    const targets = goal.targetEntities || [];

    for (const target of targets) {
      if (this.entityExists(project, 'page', target)) {
        warnings.push(`Page "${target}" already exists in project; proposal should modify or link rather than duplicate.`);
      }
      if (this.entityExists(project, 'collection', target)) {
        warnings.push(`Data collection "${target}" already exists; plan should reuse schema instead of creating duplicate.`);
      }
      if (this.entityExists(project, 'workflow', target)) {
        warnings.push(`Workflow "${target}" already exists; avoid duplicate automation registration.`);
      }
      if (this.entityExists(project, 'component', target)) {
        warnings.push(`Component "${target}" already exists in page hierarchy; plan should reuse or update instead of duplicating.`);
      }
    }

    return warnings;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPRESSION & SERIALIZATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compresses component node hierarchy to outline format to maximize token efficiency.
   */
  public static compressComponentNode(node: ComponentNode | any, depth: number = 0, maxDepth: number = 3): any {
    if (!node) return null;
    const compressed: any = {
      type: node.type,
      name: node.name,
    };

    if (node.props?.text) compressed.text = node.props.text;
    if (node.bindings && Object.keys(node.bindings).length > 0) {
      compressed.bindings = Object.keys(node.bindings);
    }

    if (depth < maxDepth && Array.isArray(node.children) && node.children.length > 0) {
      compressed.children = node.children.map((c: any) => this.compressComponentNode(c, depth + 1, maxDepth));
    } else if (Array.isArray(node.children) && node.children.length > 0) {
      compressed.childrenCount = node.children.length;
    }

    return compressed;
  }

  /**
   * Formats the selected context items into an isolated, Markdown-delimited block for LLM prompts.
   */
  public static formatForPrompt(items: IntelligentContextItem[]): string {
    const sections: string[] = ['<project_context>'];

    const grouped: Record<string, IntelligentContextItem[]> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }

    const categories = Object.keys(grouped);
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const catItems = grouped[category];
      sections.push(`\n## ${category.toUpperCase()} CONTEXT`);
      for (let j = 0; j < catItems.length; j++) {
        const item = catItems[j];
        sections.push(`- [${item.source}] (priority: ${item.priority}, relevance: ${item.relevanceScore}): ${item.content}`);
      }
    }

    sections.push('\n</project_context>');
    return sections.join('\n');
  }

  public static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  private static countNodes(node: any): number {
    if (!node) return 0;
    let count = 1;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  private static nodeExistsByName(node: any, name: string): boolean {
    if (!node) return false;
    if ((node.name || '').toLowerCase() === name || (node.id || '').toLowerCase() === name) {
      return true;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (this.nodeExistsByName(child, name)) return true;
      }
    }
    return false;
  }
}
