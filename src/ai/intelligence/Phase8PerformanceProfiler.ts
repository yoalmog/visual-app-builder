// D8.17 / D8.19: Phase 8 Performance Profiler
// Instruments and measures latency across planning, context extraction, execution, verification, and persistence.
// Fully delegates to PerformanceProfilerEngine for high-precision stage profiling and parallel batch execution.

import { PerformanceProfilerEngine } from '../performance/PerformanceProfilerEngine';
import { PipelinePerformanceProfile } from '../performance/performance-types';

export interface LatencyMetric {
  stage: string;
  durationMs: number;
  timestamp: string;
}

export class Phase8PerformanceProfiler {
  /**
   * Times the execution of an asynchronous or synchronous function.
   */
  public static async measure<T>(stage: string, fn: () => Promise<T> | T): Promise<{ result: T; durationMs: number }> {
    const { result, metric } = await PerformanceProfilerEngine.measure(stage, fn);
    return {
      result,
      durationMs: metric.durationMs,
    };
  }

  public static getMetrics(): LatencyMetric[] {
    return PerformanceProfilerEngine.getMetrics().map((m) => ({
      stage: String(m.stage),
      durationMs: m.durationMs,
      timestamp: new Date(m.endEpochMs).toISOString(),
    }));
  }

  public static computeProfile(): PipelinePerformanceProfile {
    return PerformanceProfilerEngine.computeProfile();
  }

  public static clear(): void {
    PerformanceProfilerEngine.clear();
  }
}
