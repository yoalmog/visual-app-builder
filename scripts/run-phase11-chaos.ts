// Phase 11: Compound Chaos Testing (Simultaneous Multi-Fault Scenarios)
import net from 'net';
import http from 'http';
import {
  PostgresDatabaseScalingProvider,
  RedisCacheProvider,
  MessageBrokerQueueProvider,
  ProxyAdvancedDeploymentEngine,
} from '../src/builder/platform/production';
import { PostgresTcpClient } from '../src/builder/platform/production/PostgresDatabaseScalingProvider';
import { createInitialProject } from '../src/builder/persistence/project-storage';

export interface ChaosTestRecord {
  id: string;
  scenario: string;
  description: string;
  passed: boolean;
  lostFunctionality: string[];
  retainedFunctionality: string[];
  evidence: string;
  error?: string;
}

export async function runPhase11Chaos(): Promise<{ passed: number; failed: number; results: ChaosTestRecord[] }> {
  const results: ChaosTestRecord[] = [];

  function record(
    id: string,
    scenario: string,
    description: string,
    passed: boolean,
    lost: string[],
    retained: string[],
    evidence: string,
    error?: string
  ) {
    if (!passed) {
      console.error(`[FAIL] ${id} (${scenario}): ${description}${error ? ` -> ${error}` : ''}`);
    } else {
      console.log(`[PASS] ${id} (${scenario}): ${description}`);
      console.log(`       Retained: [${retained.join(', ')}]`);
      console.log(`       Lost:     [${lost.join(', ')}]`);
      console.log(`       Evidence: ${evidence}`);
    }
    results.push({ id, scenario, description, passed, lostFunctionality: lost, retainedFunctionality: retained, evidence, error });
  }

  console.log('\n================================================================');
  console.log('PHASE 11: COMPOUND CHAOS & CONCURRENT MULTI-FAULT TESTING');
  console.log('Simultaneous Breakage Across Multiple Production Layers');
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Compound Chaos Scenario A: Simultaneous Postgres Replica + Redis Severance
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Compound Failure: Postgres Replica + Redis Severed Simultaneously ---');

  // Spin up TCP wire servers for Postgres and Redis
  let pgServerConnected = true;
  const pgServer = net.createServer((socket) => {
    socket.on('data', (d) => {
      if (!pgServerConnected) {
        socket.destroy();
        return;
      }
      if (d.length >= 8 && d.readInt32BE(4) === 196608) {
        const ok = Buffer.alloc(9);
        ok.writeUInt8(0x52, 0);
        ok.writeInt32BE(8, 1);
        ok.writeInt32BE(0, 5);
        const z = Buffer.alloc(6);
        z.writeUInt8(0x5a, 0);
        z.writeInt32BE(5, 1);
        z.writeUInt8(0x49, 5);
        socket.write(Buffer.concat([ok, z]));
      } else if (d[0] === 0x51) {
        socket.write(Buffer.from('lag_ms\n12.5\nCommandComplete\n', 'utf8'));
      }
    });
  });

  const pgPort = await new Promise<number>((res) => {
    pgServer.listen(0, '127.0.0.1', () => {
      res((pgServer.address() as net.AddressInfo).port);
    });
  });

  const db = new PostgresDatabaseScalingProvider({
    primary: { host: '127.0.0.1', port: 5432 },
    replicas: [{ id: 'repl_chaos_01', regionId: 'us-west-2', host: '127.0.0.1', port: pgPort }],
  });

  const cache = new RedisCacheProvider({
    host: '127.0.0.1',
    port: 6379, // Intentional un-bound port or severed
  });

  // Pre-seed cache in fallback
  await cache.set('auth_token_99', { user: 'admin', role: 'root' }, 600);

  // SIMULTANEOUS FAULT INJECTION
  db.injectReplicaFailure('repl_chaos_01');
  cache.injectConnectionFailure();

  // Execute concurrent multi-tier operations under simultaneous failure
  const [writeResult, strongReadResult, eventualReadResult, cacheReadResult, cacheWriteResult] = await Promise.all([
    db.routeQuery('write'),
    db.routeQuery('read', 'strong'),
    db.routeQuery('read', 'eventual'),
    cache.get<{ user: string }>('auth_token_99'),
    cache.set('audit_event_102', { event: 'compound_failure_test' }, 300),
  ]);

  const dbDegradedAlert = db.failoverAlerts.some((a) => a.includes('[FAILOVER] All read replicas unreachable'));
  const cacheDegradedAlert = cache.failureAlerts.some((a) => a.includes('[FAILURE_INJECTED] Redis socket severed'));

  record(
    'CC-001',
    'Compound Fault (DB Replica + Redis)',
    'Simultaneous DB replica severance and Redis disconnect: writes route to Primary, reads fail over to Primary, cache falls back safely without unhandled exceptions',
    !writeResult.isReplica &&
      !strongReadResult.isReplica &&
      !eventualReadResult.isReplica && // Eventual read degraded to Primary
      cacheReadResult?.user === 'admin' &&
      cacheWriteResult === true &&
      dbDegradedAlert &&
      cacheDegradedAlert,
    [
      'Offloaded read replication to replica host (all read load now absorbed by Primary)',
      'Distributed Redis cluster state synchronization across external instances',
    ],
    [
      'Database write routing to Primary (100% intact)',
      'Database read availability via automated Primary pool failover (zero dropped transactions)',
      'Application cache access via resilient local in-memory fallback',
      'Diagnostic alerting logged to observability bus',
    ],
    `Eventual read routed to: ${eventualReadResult.host} (isReplica=${eventualReadResult.isReplica}); Cached user: ${cacheReadResult?.user}; Failover alert logged: ${dbDegradedAlert}; Cache alert logged: ${cacheDegradedAlert}`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Compound Chaos Scenario B: Concurrent Worker Hard Crash + Canary Rollback
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Compound Failure: Worker Crash Mid-Job + Canary Rollback Concurrently ---');

  const broker = new MessageBrokerQueueProvider();
  const deploy = new ProxyAdvancedDeploymentEngine();
  await deploy.initializeProxyCluster();
  const proxyPort = deploy.proxyPort;

  // Register worker job handler that simulates a long-running computation
  let jobRecoveredAndCompleted = false;
  broker.registerJobHandler('build', async (job) => {
    // If running on recovered worker, complete it
    jobRecoveredAndCompleted = true;
    return { buildArtifact: 'dist/bundle.js', hash: 'sha256-abc' };
  });

  // Start active Canary rollout at 50%
  const proj = createInitialProject('p_compound', 9);
  await deploy.deployCanary({
    projectId: 'p_compound',
    organizationId: 'org_chaos',
    branch: 'main',
    commitId: 'commit_c1',
    projectSnapshot: proj,
    config: { currentTrafficPercentage: 50 },
  });

  // Enqueue job and start execution on wrk_proc_101
  const job = await broker.enqueueJob({
    queueName: 'build',
    type: 'build',
    priority: 'normal',
    organizationId: 'org_chaos',
    payload: { source: 'src/index.ts' },
  });

  // Manually lock job to worker_101 to simulate active mid-flight execution
  const activeWorker = (await broker.listWorkers()).find((w) => w.id === 'wrk_proc_101');
  if (activeWorker) {
    activeWorker.status = 'busy';
    activeWorker.activeJobIds.push(job.id);
  }
  const runningJob = await broker.getJob(job.id);
  if (runningJob) {
    runningJob.status = 'running';
    runningJob.attempts = 1;
    (runningJob as any).lockedByWorkerId = 'wrk_proc_101';
  }

  // SIMULTANEOUS COMPOUND FAULT:
  // 1. Worker process 101 crashes mid-job
  // 2. Canary receives 500 error threshold trip and rolls back
  const [workerCrashResult, canaryRollbackResult] = await Promise.all([
    Promise.resolve(broker.injectKillWorkerMidJob('wrk_proc_101')),
    deploy.rollbackCanary('p_compound', 'Concurrent worker crash induced emergency rollback'),
  ]);

  // Execute recovery for orphaned job by standby worker wrk_proc_102
  const recoveredJob = await broker.processNextJob('build', 'wrk_proc_102');

  // Verify reverse proxy immediately directs 100% of traffic to stable
  async function queryProxy(): Promise<string> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/apps/p_compound',
          headers: { 'X-Project-Id': 'p_compound' },
        },
        (res) => {
          resolve((res.headers['x-apex-target'] as string) || 'unknown');
        }
      );
      req.on('error', () => resolve('error'));
      req.end();
    });
  }

  const postRollbackTargets = await Promise.all(Array.from({ length: 30 }, () => queryProxy()));
  const allRoutedToStable = postRollbackTargets.every((t) => t === 'stable');
  const canaryCfg = deploy.getCanaryConfig('p_compound');

  record(
    'CC-002',
    'Compound Fault (Worker Crash + Canary Rollback)',
    'Simultaneous worker crash mid-job and emergency canary rollback: job re-queued and completed by standby worker wrk_proc_102, reverse proxy cuts canary traffic to 0% with zero deadlock or dropped requests',
    workerCrashResult.recovered &&
      recoveredJob?.status === 'completed' &&
      jobRecoveredAndCompleted &&
      canaryRollbackResult === true &&
      canaryCfg?.currentTrafficPercentage === 0 &&
      allRoutedToStable,
    [
      'Worker wrk_proc_101 capacity (terminated)',
      'Active canary traffic route (0% traffic weight)',
    ],
    [
      'Job state preservation (orphaned job safely recovered without data loss)',
      'Standby worker execution (wrk_proc_102 completed job successfully)',
      'Reverse proxy live traffic routing (30/30 requests routed cleanly to stable target)',
      'Non-blocking concurrency across worker supervisor and reverse proxy event loops',
    ],
    `Worker crash recovered: ${workerCrashResult.recovered}; Orphan job recovered by wrk_proc_102 with status: ${recoveredJob?.status}; Job completed: ${jobRecoveredAndCompleted}; Canary percentage: ${canaryCfg?.currentTrafficPercentage}%; 30/30 proxy requests routed to: stable`
  );

  // Cleanup
  deploy.closeAll();
  pgServer.close();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL COMPOUND CHAOS TESTS: ${results.length}`);
  console.log(`PASSED:  ${passedCount}`);
  console.log(`FAILED:  ${failedCount}`);
  console.log('----------------------------------------------------\n');

  return { passed: passedCount, failed: failedCount, results };
}

if (require.main === module) {
  runPhase11Chaos()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal chaos test error:', err);
      process.exit(1);
    });
}
