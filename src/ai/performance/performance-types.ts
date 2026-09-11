// D8.17: Performance Profiling, Token Economics & Latency Optimization Types

export type PerformanceStage =
  | 'SANITIZATION_AND_SECURITY'
  | 'GOAL_UNDERSTANDING'
  | 'CONTEXT_INTELLIGENCE'
  | 'GUARDRAILS_SYNTHESIS'
  | 'PLAN_GENERATION'
  | 'DECISION_OPTIMIZATION'
  | 'PLAN_VALIDATION'
  | 'AUTONOMY_GATING'
  | 'PRE_GUARDRAILS'
  | 'HITL_SUPERVISION'
  | 'TRANSACTION_EXECUTION'
  | 'LIVE_WATCHDOG'
  | 'AUTONOMOUS_VERIFICATION'
  | 'POST_GUARDRAILS'
  | 'EXPLAINABILITY'
  | 'EXPERIENCE_LEARNING'
  | 'REPORT_GENERATION';

export interface StageLatencyMetric {
  stage: PerformanceStage | string;
  durationMs: number;
  startEpochMs: number;
  endEpochMs: number;
  memoryDeltaBytes?: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'THROTTLED';
  metadata?: Record<string, any>;
}

export interface PipelinePerformanceProfile {
  totalDurationMs: number;
  stageBreakdown: StageLatencyMetric[];
  percentiles: {
    p50Ms: number;
    p90Ms: number;
    p99Ms: number;
  };
  hotspots: string[];
  optimizationRecommendations: string[];
  generatedAt: string;
}

export type SupportedModelId =
  | 'gemini-3.5-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.8-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'claude-3-5-sonnet'
  | 'gpt-4o'
  | 'gpt-4o-mini';

export interface ModelPricingTier {
  modelId: SupportedModelId;
  inputCostPerMillion: number;  // USD
  outputCostPerMillion: number; // USD
  cachedInputCostPerMillion: number; // USD
}

export interface TokenUsageReport {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  modelId: SupportedModelId;
  compressionSavingsTokens: number;
  compressionRatioPercent: number; // 0 - 100%
  timestamp: string;
}

export interface TokenBudgetCeiling {
  softLimitTokens: number;
  hardLimitTokens: number;
  maxCostUsdPerSession: number;
  autoCompressThresholdTokens: number;
  enforceStrictCeilings: boolean;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  hits: number;
  ttlMs: number;
  tag?: string;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRatio: number; // 0.0 - 1.0
  memoryUsedBytes: number;
  evictions: number;
}
