import { ScheduledTriggerConfig } from '../schema/workflow';

export interface ScheduledJobInfo {
  jobId: string;
  config: ScheduledTriggerConfig;
  status: 'active' | 'paused' | 'cancelled';
  lastRun?: string;
  nextRun?: string;
}

export interface SchedulerProvider {
  scheduleJob(jobId: string, config: ScheduledTriggerConfig, handler: () => Promise<void> | void): void;
  cancelJob(jobId: string): void;
  triggerJob(jobId: string): Promise<void>;
  listJobs(): ScheduledJobInfo[];
}

export class MockSchedulerProvider implements SchedulerProvider {
  private jobs: Map<string, { info: ScheduledJobInfo; handler: () => Promise<void> | void; timer?: NodeJS.Timeout }> = new Map();

  public scheduleJob(jobId: string, config: ScheduledTriggerConfig, handler: () => Promise<void> | void): void {
    this.cancelJob(jobId);

    const now = Date.now();
    let nextRun: string | undefined;

    if (config.type === 'one_time' && config.timestamp) {
      nextRun = new Date(config.timestamp).toISOString();
    } else if (config.type === 'interval' && config.intervalMs) {
      nextRun = new Date(now + config.intervalMs).toISOString();
    } else if (config.type === 'cron') {
      // Approximate next run in 60s for mock
      nextRun = new Date(now + 60000).toISOString();
    }

    const info: ScheduledJobInfo = {
      jobId,
      config,
      status: config.enabled ? 'active' : 'paused',
      nextRun,
    };

    let timer: NodeJS.Timeout | undefined;
    if (config.enabled) {
      if (config.type === 'one_time' && config.timestamp) {
        const delay = Math.max(0, config.timestamp - now);
        timer = setTimeout(async () => {
          info.lastRun = new Date().toISOString();
          info.status = 'cancelled';
          await handler();
        }, delay);
      } else if (config.type === 'interval' && config.intervalMs) {
        timer = setInterval(async () => {
          info.lastRun = new Date().toISOString();
          info.nextRun = new Date(Date.now() + (config.intervalMs || 60000)).toISOString();
          await handler();
        }, config.intervalMs);
      }
    }

    this.jobs.set(jobId, { info, handler, timer });
  }

  public cancelJob(jobId: string): void {
    const existing = this.jobs.get(jobId);
    if (existing) {
      if (existing.timer) clearTimeout(existing.timer);
      existing.info.status = 'cancelled';
      this.jobs.delete(jobId);
    }
  }

  public async triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    job.info.lastRun = new Date().toISOString();
    await job.handler();
  }

  public listJobs(): ScheduledJobInfo[] {
    return Array.from(this.jobs.values()).map(j => ({ ...j.info }));
  }
}
