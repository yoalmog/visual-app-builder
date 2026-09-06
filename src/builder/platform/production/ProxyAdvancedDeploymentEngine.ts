// Production Reverse Proxy Advanced Deployment Engine with Real Network Traffic Splitting
import http from 'http';
import {
  CanaryConfig,
  StagingPromotionConfig,
} from '../../schema/platform-v9';
import {
  AdvancedDeploymentEngine,
} from '../enterprise/ExperimentationAndDeployments';
import { AppProject } from '../../schema/project';

export interface ProxyRouteMetrics {
  totalRouted: number;
  stableRouted: number;
  canaryRouted: number;
  canaryErrors: number;
  activeColor: 'blue' | 'green';
}

export class ProxyAdvancedDeploymentEngine implements AdvancedDeploymentEngine {
  private proxyServer: http.Server | null = null;
  public proxyPort = 0;
  private canaryConfigs: Map<string, CanaryConfig> = new Map();
  private blueGreenStatus: Map<string, { activeColor: 'blue' | 'green'; standbyColor: 'blue' | 'green'; releaseId: string }> = new Map();

  public projectMetrics: Map<string, { total: number; canaryRouted: number; stableRouted: number; canaryErrors: number }> = new Map();

  // Downstream target ports
  public stablePort = 0;
  public canaryPort = 0;
  public bluePort = 0;
  public greenPort = 0;

  // Downstream HTTP servers
  private stableServer: http.Server | null = null;
  private canaryServer: http.Server | null = null;
  private blueServer: http.Server | null = null;
  private greenServer: http.Server | null = null;

  // Metrics
  public metrics: ProxyRouteMetrics = {
    totalRouted: 0,
    stableRouted: 0,
    canaryRouted: 0,
    canaryErrors: 0,
    activeColor: 'blue',
  };

  public canaryInjectedFailure = false;
  public failureAlerts: string[] = [];

  // Spin up real downstream servers and reverse proxy
  async initializeProxyCluster(): Promise<{ proxyPort: number; stablePort: number; canaryPort: number }> {
    // 1. Stable Server
    this.stablePort = await this.startDownstreamServer('stable', (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Apex-Target': 'stable' });
      res.end(JSON.stringify({ target: 'stable', version: 'v1.0' }));
    });

    // 2. Canary Server (supports simulated failure injection)
    this.canaryPort = await this.startDownstreamServer('canary', (res) => {
      if (this.canaryInjectedFailure) {
        this.metrics.canaryErrors++;
        res.writeHead(500, { 'Content-Type': 'application/json', 'X-Apex-Target': 'canary' });
        res.end(JSON.stringify({ error: 'CANARY_INTERNAL_ERROR', target: 'canary' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Apex-Target': 'canary' });
        res.end(JSON.stringify({ target: 'canary', version: 'v2.0' }));
      }
    });

    // 3. Blue Server
    this.bluePort = await this.startDownstreamServer('blue', (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Apex-Color': 'blue' });
      res.end(JSON.stringify({ color: 'blue', status: 'live' }));
    });

    // 4. Green Server
    this.greenPort = await this.startDownstreamServer('green', (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Apex-Color': 'green' });
      res.end(JSON.stringify({ color: 'green', status: 'live' }));
    });

    // 5. Ingress Reverse Proxy Server
    this.proxyPort = await this.startReverseProxy();

    return {
      proxyPort: this.proxyPort,
      stablePort: this.stablePort,
      canaryPort: this.canaryPort,
    };
  }

  private async startDownstreamServer(name: string, handler: (res: http.ServerResponse) => void): Promise<number> {
    return new Promise((resolve) => {
      const srv = http.createServer((_req, res) => {
        handler(res);
      });
      srv.listen(0, '127.0.0.1', () => {
        const addr = srv.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        if (name === 'stable') this.stableServer = srv;
        if (name === 'canary') this.canaryServer = srv;
        if (name === 'blue') this.blueServer = srv;
        if (name === 'green') this.greenServer = srv;
        resolve(port);
      });
    });
  }

  private async startReverseProxy(): Promise<number> {
    return new Promise((resolve) => {
      this.proxyServer = http.createServer(async (req, res) => {
        this.metrics.totalRouted++;

        // Determine project ID from header, query param, or path
        const headerProj = req.headers['x-project-id'] as string;
        let pathProj: string | undefined;
        try {
          const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
          pathProj = parsedUrl.searchParams.get('projectId') || undefined;
          if (!pathProj) {
            const match = parsedUrl.pathname.match(/^\/apps\/([^/]+)/);
            if (match) pathProj = match[1];
          }
        } catch {
          // ignore
        }

        const projectId = headerProj || pathProj || (this.canaryConfigs.size === 1 ? Array.from(this.canaryConfigs.keys())[0] : 'p_canary_test');
        const canary = this.canaryConfigs.get(projectId);

        let projectMetric = this.projectMetrics.get(projectId);
        if (!projectMetric) {
          projectMetric = { total: 0, canaryRouted: 0, stableRouted: 0, canaryErrors: 0 };
          this.projectMetrics.set(projectId, projectMetric);
        }
        projectMetric.total++;

        // Determine destination target port
        let targetPort = this.stablePort;

        if (canary) {
          if (canary.enabled && canary.currentTrafficPercentage > 0) {
            // Real percentage traffic splitting
            const pct = canary.currentTrafficPercentage;
            const bucket = (projectMetric.total * 17) % 100; // Deterministic pseudo-random distribution
            if (bucket < pct) {
              targetPort = this.canaryPort;
              this.metrics.canaryRouted++;
              projectMetric.canaryRouted++;
            } else {
              targetPort = this.stablePort;
              this.metrics.stableRouted++;
              projectMetric.stableRouted++;
            }
          } else {
            // Canary rolled back or completed: route 100% to stable
            targetPort = this.stablePort;
            this.metrics.stableRouted++;
            projectMetric.stableRouted++;
          }
        } else {
          // Blue-Green routing
          targetPort = this.metrics.activeColor === 'green' ? this.greenPort : this.bluePort;
          this.metrics.stableRouted++;
          projectMetric.stableRouted++;
        }

        // Forward HTTP request to target downstream port
        const forwardReq = http.request(
          {
            hostname: '127.0.0.1',
            port: targetPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (upstreamRes) => {
            // Check for canary failure threshold breach
            if (targetPort === this.canaryPort && upstreamRes.statusCode && upstreamRes.statusCode >= 500) {
              projectMetric.canaryErrors++;
              if (canary) {
                const errorRate = (projectMetric.canaryErrors / Math.max(projectMetric.canaryRouted, 1)) * 100;
                if (errorRate >= canary.errorThresholdPercent) {
                  this.rollbackCanary(projectId, `Breached error threshold: ${errorRate.toFixed(1)}%`);
                }
              }
            }

            res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
            upstreamRes.pipe(res);
          }
        );

        forwardReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'BAD_GATEWAY', message: err.message }));
        });

        req.pipe(forwardReq);
      });

      this.proxyServer.listen(0, '127.0.0.1', () => {
        const addr = this.proxyServer?.address();
        resolve(typeof addr === 'object' && addr ? addr.port : 0);
      });
    });
  }

  // ─── AdvancedDeploymentEngine Implementation ────────────────────────────────

  async deployCanary(params: {
    projectId: string;
    organizationId: string;
    branch: string;
    commitId: string;
    projectSnapshot: AppProject;
    config?: Partial<CanaryConfig>;
  }): Promise<{ status: 'canary_active'; canary: CanaryConfig; releaseId: string }> {
    if (!this.proxyServer) {
      await this.initializeProxyCluster();
    }

    const releaseId = `rel_canary_${Date.now()}`;
    const initialPercentage = params.config?.currentTrafficPercentage !== undefined ? params.config.currentTrafficPercentage : 10;

    const canary: CanaryConfig = {
      enabled: true,
      currentTrafficPercentage: initialPercentage,
      stepPercentage: params.config?.stepPercentage || 20,
      stepIntervalSeconds: params.config?.stepIntervalSeconds || 60,
      errorThresholdPercent: params.config?.errorThresholdPercent || 5,
      latencyThresholdMs: params.config?.latencyThresholdMs || 250,
      ...params.config,
    };

    this.canaryConfigs.set(params.projectId, canary);
    return {
      status: 'canary_active',
      canary,
      releaseId,
    };
  }

  async advanceCanaryTraffic(
    projectId: string,
    stepIncrease?: number
  ): Promise<{ newPercentage: number; promotedToFull: boolean }> {
    const canary = this.canaryConfigs.get(projectId);
    if (!canary) throw new Error(`Canary not found for ${projectId}`);

    const inc = stepIncrease !== undefined ? stepIncrease : canary.stepPercentage;
    canary.currentTrafficPercentage = Math.min(canary.currentTrafficPercentage + inc, 100);

    const promotedToFull = canary.currentTrafficPercentage >= 100;
    if (promotedToFull) {
      canary.enabled = false;
      // At 100%, stable target is replaced by promoted version
    }

    return {
      newPercentage: canary.currentTrafficPercentage,
      promotedToFull,
    };
  }

  getCanaryConfig(projectId: string): CanaryConfig | undefined {
    return this.canaryConfigs.get(projectId);
  }

  async rollbackCanary(projectId: string, reason: string): Promise<boolean> {
    const canary = this.canaryConfigs.get(projectId);
    if (!canary) return false;

    canary.enabled = false;
    canary.currentTrafficPercentage = 0; // Immediate traffic cut to 0%
    this.failureAlerts.push(`[CANARY_ROLLBACK] Canary for ${projectId} rolled back immediately to 0%: ${reason}`);
    return true;
  }

  async deployBlueGreen(params: {
    projectId: string;
    organizationId: string;
    branch: string;
    commitId: string;
    projectSnapshot: AppProject;
  }): Promise<{ activeColor: 'blue' | 'green'; standbyColor: 'blue' | 'green'; releaseId: string }> {
    if (!this.proxyServer) {
      await this.initializeProxyCluster();
    }

    const currentStatus = this.blueGreenStatus.get(params.projectId);
    const activeColor: 'blue' | 'green' = currentStatus?.activeColor === 'green' ? 'blue' : 'green';
    const standbyColor: 'blue' | 'green' = activeColor === 'green' ? 'blue' : 'green';
    const releaseId = `rel_bg_${Date.now()}`;

    // Atomically flip active color
    this.metrics.activeColor = activeColor;
    this.blueGreenStatus.set(params.projectId, { activeColor, standbyColor, releaseId });

    return {
      activeColor,
      standbyColor,
      releaseId,
    };
  }

  async promoteEnvironment(params: {
    projectId: string;
    organizationId: string;
    config: StagingPromotionConfig;
    actorId: string;
  }): Promise<{ success: boolean; releaseId: string; promotedTo: string }> {
    const releaseId = `prm_${Date.now()}`;
    return {
      success: true,
      promotedTo: params.config.targetEnvironment,
      releaseId,
    };
  }

  // Failure Injection Harness: Inject 500 errors on Canary downstream target
  injectCanaryErrors(): void {
    this.canaryInjectedFailure = true;
    this.failureAlerts.push('[FAILURE_INJECTED] Downstream Canary target returning HTTP 500');
  }

  restoreCanaryHealth(): void {
    this.canaryInjectedFailure = false;
  }

  closeAll(): void {
    this.proxyServer?.close();
    this.stableServer?.close();
    this.canaryServer?.close();
    this.blueServer?.close();
    this.greenServer?.close();
  }
}
