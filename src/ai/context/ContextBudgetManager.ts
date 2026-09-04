// Context Budget Manager: Token estimation, prioritization, and payload size bounds

export interface ContextItem {
  id: string;
  category: 'project' | 'page' | 'selection' | 'data' | 'workflow' | 'runtime' | 'conversation';
  priority: number; // 1 = highest, 10 = lowest
  content: string;
  estimatedTokens: number;
}

export class ContextBudgetManager {
  private maxTokens: number;

  constructor(maxTokens = 8000) {
    this.maxTokens = maxTokens;
  }

  /**
   * Estimates token count using standard 4 characters per token heuristic.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Prioritizes and fits context items within the token budget.
   */
  public pack(items: ContextItem[]): { packed: ContextItem[]; totalTokens: number; truncatedItems: string[] } {
    // Sort by priority ascending (1 first)
    const sorted = [...items].sort((a, b) => a.priority - b.priority);

    const packed: ContextItem[] = [];
    const truncatedItems: string[] = [];
    let currentTokens = 0;

    for (const item of sorted) {
      if (currentTokens + item.estimatedTokens <= this.maxTokens) {
        packed.push(item);
        currentTokens += item.estimatedTokens;
      } else {
        // Check if we can partially compress or truncate this item
        const remainingBudget = this.maxTokens - currentTokens;
        if (remainingBudget >= 200 && item.priority <= 3) {
          // Truncate critical item to remaining budget
          const maxChars = remainingBudget * 4;
          const compressed = item.content.slice(0, maxChars) + '\n...[Context truncated due to token budget]';
          packed.push({
            ...item,
            content: compressed,
            estimatedTokens: remainingBudget,
          });
          currentTokens += remainingBudget;
          truncatedItems.push(item.id);
          break;
        } else {
          truncatedItems.push(item.id);
        }
      }
    }

    return { packed, totalTokens: currentTokens, truncatedItems };
  }
}
