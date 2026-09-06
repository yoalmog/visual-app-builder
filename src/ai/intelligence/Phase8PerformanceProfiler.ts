// D8.19: Phase 8 Performance Profiler
// Instruments and measures latency across planning, context extraction, execution, verification, and persistence.

export interface LatencyMetric {
  stage: string;
  durationMs: number;
  timestamp: string;
}

export class Phase8PerformanceProfiler {
  private static metrics: LatencyMetric[] = [];

  /**
   * Times the execution of an asynchronous or synchronous function.
   */
  public static async measure<T>(stage: string, fn: () => Promise<T> | T): Promise<{ result: T; durationMs: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    this.metrics.push({
      stage,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });

    return { result, durationMs };
  }

  public static getMetrics(): LatencyMetric[] {
    return [...this.metrics];
  }

  public static clear(): void {
    this.metrics = [];
  }
}
