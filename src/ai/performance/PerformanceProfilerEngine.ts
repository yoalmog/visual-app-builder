// D8.17: Performance Profiler & Parallel Batch Engine
// High-precision HR-time stage instrumentation, percentile analysis, hotspot detection, and parallel execution.

import {
  PerformanceStage,
  PipelinePerformanceProfile,
  StageLatencyMetric,
} from './performance-types';

export class PerformanceProfilerEngine {
  private static recordedMetrics: StageLatencyMetric[] = [];
  private static activeTimers: Map<
    string,
    { stage: PerformanceStage | string; startNano: bigint; startEpochMs: number; metadata?: Record<string, any> }
  > = new Map();

  private static getNanoTime(): bigint {
    if (typeof process !== 'undefined' && process.hrtime?.bigint) {
      return process.hrtime.bigint();
    }
    const ms = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return BigInt(Math.round(ms * 1_000_000));
  }

  /**
   * Starts a high-precision stage timer.
   */
  public static startStage(stage: PerformanceStage | string, metadata?: Record<string, any>): string {
    const timerId = `timer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeTimers.set(timerId, {
      stage,
      startNano: this.getNanoTime(),
      startEpochMs: Date.now(),
      metadata,
    });
    return timerId;
  }

  /**
   * Stops a stage timer and records the latency metric.
   */
  public static endStage(
    timerId: string,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'THROTTLED' = 'SUCCESS'
  ): StageLatencyMetric {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      throw new Error(`Performance timer not found or already concluded: ${timerId}`);
    }

    const endNano = this.getNanoTime();
    const endEpochMs = Date.now();
    const durationMs = Math.round(Number(endNano - timer.startNano) / 10_000) / 100; // 2 decimal precision

    this.activeTimers.delete(timerId);

    const metric: StageLatencyMetric = {
      stage: timer.stage,
      durationMs,
      startEpochMs: timer.startEpochMs,
      endEpochMs,
      status,
      metadata: timer.metadata,
    };

    this.recordedMetrics.push(metric);
    return metric;
  }

  /**
   * Times the execution of an async or sync function directly.
   */
  public static async measure<T>(
    stage: PerformanceStage | string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metric: StageLatencyMetric }> {
    const timerId = this.startStage(stage, metadata);
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    try {
      const result = await fn();
      const metric = this.endStage(timerId, 'SUCCESS');
      return { result, metric };
    } catch (err) {
      status = 'FAILED';
      this.endStage(timerId, status);
      throw err;
    }
  }

  /**
   * Computes a full pipeline performance profile with p50, p90, p99 percentiles and hotspots.
   */
  public static computeProfile(metricsInput?: StageLatencyMetric[]): PipelinePerformanceProfile {
    const metrics = metricsInput && metricsInput.length > 0 ? metricsInput : this.recordedMetrics;
    const totalDurationMs = Math.round(metrics.reduce((acc, m) => acc + m.durationMs, 0) * 100) / 100;

    const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);

    const p50Ms = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
    const p90Ms = durations.length > 0 ? durations[Math.floor(durations.length * 0.9)] : 0;
    const p99Ms = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.99))] : 0;

    // Detect Hotspots: stages taking > 30% of total duration or > 400ms
    const hotspots: string[] = [];
    const recommendations: string[] = [];

    for (const m of metrics) {
      const stageRatio = totalDurationMs > 0 ? m.durationMs / totalDurationMs : 0;
      if (stageRatio >= 0.3 || m.durationMs >= 400) {
        hotspots.push(String(m.stage));
        recommendations.push(
          `Stage "${m.stage}" latency (${m.durationMs}ms) represents ${Math.round(stageRatio * 100)}% of pipeline: enable aggressive AST/Context caching.`
        );
      }
    }

    if (metrics.some((m) => m.status === 'THROTTLED')) {
      recommendations.push('Live watchdog throttling was detected during execution: increase rate limit ceilings or batch operations.');
    }

    return {
      totalDurationMs,
      stageBreakdown: [...metrics],
      percentiles: {
        p50Ms: Math.round(p50Ms * 100) / 100,
        p90Ms: Math.round(p90Ms * 100) / 100,
        p99Ms: Math.round(p99Ms * 100) / 100,
      },
      hotspots,
      optimizationRecommendations: recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes tasks in high-throughput parallel batches while respecting concurrency limits.
   */
  public static async executeParallelBatch<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency = 4
  ): Promise<{ results: R[]; durationMs: number; throughputOpsPerSec: number }> {
    const startTime = Date.now();
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await fn(items[index], index);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    const durationMs = Math.max(1, Date.now() - startTime);
    const throughputOpsPerSec = Math.round((items.length / (durationMs / 1000)) * 10) / 10;

    return {
      results,
      durationMs,
      throughputOpsPerSec,
    };
  }

  public static getMetrics(): StageLatencyMetric[] {
    return [...this.recordedMetrics];
  }

  public static clear(): void {
    this.recordedMetrics = [];
    this.activeTimers.clear();
  }
}
