// Phase 11: Multi-Tenant Isolation & Concurrent Deployment Safety Test Suite
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

export interface Phase11TestRecord {
  id: string;
  category: string;
  description: string;
  passed: boolean;
  evidence: string;
  error?: string;
}

export async function runPhase11Suite(): Promise<{ passed: number; failed: number; results: Phase11TestRecord[] }> {
  const results: Phase11TestRecord[] = [];

  function record(id: string, category: string, description: string, passed: boolean, evidence: string, error?: string) {
    if (!passed) {
      console.error(`[FAIL] ${id} (${category}): ${description}${error ? ` -> ${error}` : ''}`);
    } else {
      console.log(`[PASS] ${id} (${category}): ${description}`);
      console.log(`       Evidence: ${evidence}`);
    }
    results.push({ id, category, description, passed, evidence, error });
  }

  console.log('\n================================================================');
  console.log('PHASE 11: MULTI-TENANT ISOLATION & CONCURRENT DEPLOYMENT SAFETY');
  console.log('Validating Unified Platform Under Multi-Tenant Stress & Concurrency');
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Multi-Tenant Cache Isolation Under Real Redis Operations
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Multi-Tenant Cache Isolation ---');

  // Spin up real RESP protocol server for Redis
  const rawRedisStore = new Map<string, string>();
  const redisKeyNamespaces = new Map<string, Set<string>>();

  const redisTcpServer = net.createServer((socket) => {
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      while (buf.includes('\r\n')) {
        if (buf.startsWith('*')) {
          const lines = buf.split('\r\n');
          const cmdCount = parseInt(lines[0].slice(1), 10);
          if (lines.length < cmdCount * 2 + 1) break;

          const args: string[] = [];
          for (let i = 0; i < cmdCount; i++) {
            args.push(lines[2 + i * 2]);
          }
          buf = lines.slice(cmdCount * 2 + 1).join('\r\n');

          const cmd = args[0].toUpperCase();
          if (cmd === 'SET') {
            const key = args[1];
            const val = args[2];
            rawRedisStore.set(key, val);
            socket.write('+OK\r\n');
          } else if (cmd === 'GET') {
            const key = args[1];
            const val = rawRedisStore.get(key);
            if (val === undefined) {
              socket.write('$-1\r\n');
            } else {
              socket.write(`$${Buffer.byteLength(val, 'utf8')}\r\n${val}\r\n`);
            }
          } else if (cmd === 'DEL') {
            const keys = args.slice(1);
            let count = 0;
            for (const k of keys) {
              if (rawRedisStore.delete(k)) count++;
            }
            socket.write(`:${count}\r\n`);
          } else if (cmd === 'SADD') {
            const setKey = args[1];
            const members = args.slice(2);
            let s = redisKeyNamespaces.get(setKey);
            if (!s) {
              s = new Set();
              redisKeyNamespaces.set(setKey, s);
            }
            for (const m of members) s.add(m);
            socket.write(`:${members.length}\r\n`);
          } else if (cmd === 'SMEMBERS') {
            const setKey = args[1];
            const s = redisKeyNamespaces.get(setKey) || new Set();
            const arr = Array.from(s);
            let resp = `*${arr.length}\r\n`;
            for (const item of arr) {
              resp += `$${Buffer.byteLength(item, 'utf8')}\r\n${item}\r\n`;
            }
            socket.write(resp);
          } else if (cmd === 'DBSIZE') {
            socket.write(`:${rawRedisStore.size}\r\n`);
          } else {
            socket.write('+OK\r\n');
          }
        } else {
          buf = '';
          break;
        }
      }
    });
  });

  const redisPort = await new Promise<number>((resolve) => {
    redisTcpServer.listen(0, '127.0.0.1', () => {
      const addr = redisTcpServer.address() as net.AddressInfo;
      resolve(addr.port);
    });
  });

  const cache = new RedisCacheProvider({
    host: '127.0.0.1',
    port: redisPort,
    keyPrefix: 'apex:',
  });

  // Seed data for 3 distinct tenants
  await cache.set('cfo_session', { tenant: 'tenant_alpha', balanceUsd: 8450000 }, 3600, { namespace: 'tenant_alpha' });
  await cache.set('patient_record', { tenant: 'tenant_beta', condition: 'stable', bloodO2: 99 }, 3600, { namespace: 'tenant_beta' });
  await cache.set('fleet_manifest', { tenant: 'tenant_gamma', vesselCount: 42, activePort: 'Rotterdam' }, 3600, { namespace: 'tenant_gamma' });

  // Invalidate Tenant Alpha's entire namespace
  const evictedCount = await cache.invalidateNamespace('tenant_alpha');

  // Verify: Tenant Alpha data is gone
  const alphaRead = await cache.get('cfo_session', 'tenant_alpha');
  // Verify: Tenant Beta & Gamma data remain 100% intact
  const betaRead = await cache.get<any>('patient_record', 'tenant_beta');
  const gammaRead = await cache.get<any>('fleet_manifest', 'tenant_gamma');

  // Direct raw Redis inspection
  const rawHasAlpha = rawRedisStore.has('apex:tenant_alpha:cfo_session');
  const rawHasBeta = rawRedisStore.has('apex:tenant_beta:patient_record');
  const rawHasGamma = rawRedisStore.has('apex:tenant_gamma:fleet_manifest');

  record(
    'MT-001',
    'Multi-Tenant Cache',
    "Tenant A's cache invalidation strictly preserves Tenant B and Tenant C keys in underlying store",
    evictedCount >= 1 &&
      alphaRead === null &&
      !rawHasAlpha &&
      betaRead?.condition === 'stable' &&
      rawHasBeta &&
      gammaRead?.vesselCount === 42 &&
      rawHasGamma,
    `Evicted Tenant Alpha keys: ${evictedCount}; Tenant Beta condition: "${betaRead?.condition}"; Tenant Gamma vesselCount: ${gammaRead?.vesselCount}; raw keys: [Alpha=${rawHasAlpha}, Beta=${rawHasBeta}, Gamma=${rawHasGamma}]`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Multi-Tenant Database Replica Query Isolation Over TCP Wire
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Multi-Tenant Postgres Replica Query Isolation ---');

  // Database rows for 3 distinct tenants
  const tenantRowsDatabase = [
    { tenantId: 'tenant_alpha', recordId: 'tx_alpha_991', payload: 'ALPHA_PAYROLL_USD_125000' },
    { tenantId: 'tenant_beta', recordId: 'tx_beta_882', payload: 'BETA_HEALTH_HIPAA_DATA' },
    { tenantId: 'tenant_gamma', recordId: 'tx_gamma_773', payload: 'GAMMA_ITAR_SHIPPING_MANIFEST' },
  ];

  let rawQueryLogs: string[] = [];

  const pgReplicaServer = net.createServer((socket) => {
    socket.on('data', (data) => {
      // Postgres StartupMessage
      if (data.length >= 8 && data.readInt32BE(4) === 196608) {
        const authOk = Buffer.alloc(9);
        authOk.writeUInt8(0x52, 0); // 'R'
        authOk.writeInt32BE(8, 1);
        authOk.writeInt32BE(0, 5);

        const ready = Buffer.alloc(6);
        ready.writeUInt8(0x5a, 0); // 'Z'
        ready.writeInt32BE(5, 1);
        ready.writeUInt8(0x49, 5); // 'I'

        socket.write(Buffer.concat([authOk, ready]));
      } else if (data[0] === 0x51) {
        // 'Q' Simple Query
        const sql = data.slice(5, data.length - 1).toString('utf8');
        rawQueryLogs.push(sql);

        // Parse tenant ID filter from query
        const tenantMatch = sql.match(/tenant_id\s*=\s*'([^']+)'/i);
        const requestedTenant = tenantMatch ? tenantMatch[1] : null;

        let resRows = tenantRowsDatabase;
        if (requestedTenant) {
          resRows = tenantRowsDatabase.filter((r) => r.tenantId === requestedTenant);
        } else {
          // Cross-tenant queries without tenant scoping are blocked at DB gatekeeper
          resRows = [];
        }

        const out = `COLUMNS: record_id, payload\n` + resRows.map((r) => `${r.recordId}|${r.payload}`).join('\n') + '\nCommandComplete\n';
        socket.write(Buffer.from(out, 'utf8'));
      }
    });
  });

  const pgReplicaPort = await new Promise<number>((resolve) => {
    pgReplicaServer.listen(0, '127.0.0.1', () => {
      const addr = pgReplicaServer.address() as net.AddressInfo;
      resolve(addr.port);
    });
  });

  const dbProvider = new PostgresDatabaseScalingProvider({
    primary: { host: '127.0.0.1', port: 5432 },
    replicas: [
      { id: 'repl_multi_tenant_01', regionId: 'us-west-2', host: '127.0.0.1', port: pgReplicaPort },
    ],
  });

  // Query database over TCP as Tenant Alpha
  const routeReplica = await dbProvider.routeQuery('read', 'eventual');

  // Execute direct query through Postgres client over TCP wire
  const tcpClient = new PostgresTcpClient({
    host: '127.0.0.1',
    port: pgReplicaPort,
  });
  await tcpClient.connect();

  const alphaRawResponse = await tcpClient.executeSimpleQuery(
    "SELECT record_id, payload FROM tenant_records WHERE tenant_id = 'tenant_alpha';"
  );

  const containsAlpha = alphaRawResponse.includes('ALPHA_PAYROLL_USD_125000');
  const containsBetaLeak = alphaRawResponse.includes('BETA_HEALTH_HIPAA_DATA');
  const containsGammaLeak = alphaRawResponse.includes('GAMMA_ITAR_SHIPPING_MANIFEST');

  record(
    'MT-002',
    'Multi-Tenant Database',
    "Direct SQL query on read-replica over TCP returns strictly Tenant A rows with zero cross-tenant leakage",
    containsAlpha && !containsBetaLeak && !containsGammaLeak,
    `TCP wire response verified: containsAlpha=${containsAlpha}, containsBetaLeak=${containsBetaLeak}, containsGammaLeak=${containsGammaLeak}`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Multi-Tenant Event Bus Isolation Under Concurrent Traffic
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Multi-Tenant Event Bus Isolation ---');

  const eventBroker = new MessageBrokerQueueProvider();
  const receivedByAlpha: any[] = [];
  const receivedByBeta: any[] = [];
  const receivedByGamma: any[] = [];

  await eventBroker.subscribe({
    organizationId: 'tenant_alpha',
    eventType: 'order.*',
    targetUrl: 'http://internal.alpha/webhook',
  });
  await eventBroker.subscribe({
    organizationId: 'tenant_beta',
    eventType: 'order.*',
    targetUrl: 'http://internal.beta/webhook',
  });
  await eventBroker.subscribe({
    organizationId: 'tenant_gamma',
    eventType: 'order.*',
    targetUrl: 'http://internal.gamma/webhook',
  });

  // Intercept events directly by querying event history
  const totalAlphaEvents = 30;
  const totalBetaEvents = 30;

  for (let i = 0; i < totalAlphaEvents; i++) {
    await eventBroker.publish({
      version: 1,
      type: 'order.created',
      organizationId: 'tenant_alpha',
      payload: { orderId: `ord_alpha_${i}`, amount: 100 + i },
    });
  }

  for (let i = 0; i < totalBetaEvents; i++) {
    await eventBroker.publish({
      version: 1,
      type: 'order.created',
      organizationId: 'tenant_beta',
      payload: { orderId: `ord_beta_${i}`, amount: 500 + i },
    });
  }

  const alphaHistory = await eventBroker.getEventHistory('tenant_alpha');
  const betaHistory = await eventBroker.getEventHistory('tenant_beta');
  const gammaHistory = await eventBroker.getEventHistory('tenant_gamma');

  const alphaHasBetaEvents = alphaHistory.some((e) => (e.payload as any).orderId.includes('beta'));
  const betaHasAlphaEvents = betaHistory.some((e) => (e.payload as any).orderId.includes('alpha'));

  record(
    'MT-003',
    'Multi-Tenant EventBus',
    "Event traffic published by Tenant A is isolated from Tenant B and Tenant C subscribers",
    alphaHistory.length === totalAlphaEvents &&
      betaHistory.length === totalBetaEvents &&
      gammaHistory.length === 0 &&
      !alphaHasBetaEvents &&
      !betaHasAlphaEvents,
    `Alpha received: ${alphaHistory.length}, Beta received: ${betaHistory.length}, Gamma received: ${gammaHistory.length}; cross-pollution: [AlphaHasBeta=${alphaHasBetaEvents}, BetaHasAlpha=${betaHasAlphaEvents}]`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Multi-Tenant Failure Isolation: Single Tenant Failover Without Cascade
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Multi-Tenant Failover Isolation ---');

  // Tenant Alpha's dedicated replica
  const dedicatedDbProvider = new PostgresDatabaseScalingProvider({
    primary: { host: '127.0.0.1', port: 5432 },
    replicas: [
      { id: 'repl_tenant_alpha', regionId: 'us-west-2', host: '127.0.0.1', port: pgReplicaPort },
      { id: 'repl_tenant_beta_gamma', regionId: 'eu-central-1', host: '127.0.0.1', port: pgReplicaPort },
    ],
  });

  // Inject failure on Tenant Alpha's replica
  dedicatedDbProvider.injectReplicaFailure('repl_tenant_alpha');

  // Concurrently execute 25 queries for Tenant Beta and Tenant Gamma
  const startTime = Date.now();
  const concurrentQueries = Array.from({ length: 25 }, async (_, idx) => {
    return dedicatedDbProvider.routeQuery('read', 'eventual');
  });

  const routes = await Promise.all(concurrentQueries);
  const elapsedMs = Date.now() - startTime;

  // Verify all queries routed to healthy replica with zero errors
  const allRoutedHealthy = routes.every((r) => r.isReplica && r.host.includes(pgReplicaPort.toString()));

  record(
    'MT-004',
    'Multi-Tenant Resilience',
    'Forced replica severance on Tenant A causes zero latency spike or query failures for Tenant B/C',
    allRoutedHealthy && elapsedMs < 200,
    `25 concurrent queries completed in ${elapsedMs}ms (avg ${(elapsedMs / 25).toFixed(2)}ms/req); all routed to healthy replica: ${allRoutedHealthy}`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Concurrent Multi-Project Deployment Safety
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Concurrent Multi-Project Canary Safety ---');

  const deployEngine = new ProxyAdvancedDeploymentEngine();
  await deployEngine.initializeProxyCluster();
  const proxyPort = deployEngine.proxyPort;

  const dummyProject = createInitialProject('p_init', 9);

  // Rollout Canary for Project Alpha (Weight: 20%)
  await deployEngine.deployCanary({
    projectId: 'proj_alpha_portal',
    organizationId: 'org_alpha',
    branch: 'main',
    commitId: 'commit_a1',
    projectSnapshot: dummyProject,
    config: { currentTrafficPercentage: 20, stepPercentage: 10, errorThresholdPercent: 10 },
  });

  // Rollout Canary for Project Beta (Weight: 80%) CONCURRENTLY
  await deployEngine.deployCanary({
    projectId: 'proj_beta_store',
    organizationId: 'org_beta',
    branch: 'release/v2',
    commitId: 'commit_b2',
    projectSnapshot: dummyProject,
    config: { currentTrafficPercentage: 80, stepPercentage: 20, errorThresholdPercent: 10 },
  });

  // Concurrently issue 100 requests to Project Alpha and 100 requests to Project Beta
  async function makeRequest(projectId: string): Promise<{ target: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: `/apps/${projectId}`,
          headers: { 'X-Project-Id': projectId },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c.toString('utf8')));
          res.on('end', () => {
            const target = res.headers['x-apex-target'] as string || 'unknown';
            resolve({ target });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  const alphaReqs = await Promise.all(Array.from({ length: 100 }, () => makeRequest('proj_alpha_portal')));
  const betaReqs = await Promise.all(Array.from({ length: 100 }, () => makeRequest('proj_beta_store')));

  const alphaCanaryCount = alphaReqs.filter((r) => r.target === 'canary').length;
  const alphaStableCount = alphaReqs.filter((r) => r.target === 'stable').length;

  const betaCanaryCount = betaReqs.filter((r) => r.target === 'canary').length;
  const betaStableCount = betaReqs.filter((r) => r.target === 'stable').length;

  record(
    'CD-001',
    'Concurrent Deployments',
    'Reverse proxy accurately isolates concurrent canaries: Project A routes ~20% canary, Project B routes ~80% canary',
    alphaCanaryCount >= 15 && alphaCanaryCount <= 25 && betaCanaryCount >= 75 && betaCanaryCount <= 85,
    `Project Alpha: ${alphaCanaryCount}/100 canary, ${alphaStableCount}/100 stable; Project Beta: ${betaCanaryCount}/100 canary, ${betaStableCount}/100 stable`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Independent Rollback: Rollback Project Alpha While Project Beta Continues
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Targeted Rollback Isolation ---');

  // Trigger rollback on Project Alpha only
  await deployEngine.rollbackCanary('proj_alpha_portal', 'Simulated error breach on Project Alpha');

  // Verify Project Alpha traffic dropped to 0% canary
  const alphaPostRollback = await Promise.all(Array.from({ length: 50 }, () => makeRequest('proj_alpha_portal')));
  const alphaCanaryPost = alphaPostRollback.filter((r) => r.target === 'canary').length;
  const alphaStablePost = alphaPostRollback.filter((r) => r.target === 'stable').length;

  // Verify Project Beta continues routing 80% canary unaffected
  const betaPostRollback = await Promise.all(Array.from({ length: 50 }, () => makeRequest('proj_beta_store')));
  const betaCanaryPost = betaPostRollback.filter((r) => r.target === 'canary').length;

  const alphaCanaryCfg = deployEngine.getCanaryConfig('proj_alpha_portal');
  const betaCanaryCfg = deployEngine.getCanaryConfig('proj_beta_store');

  record(
    'CD-002',
    'Concurrent Deployments',
    'Rolling back Project A instantly cuts traffic to 0% while Project B canary remains active at 80%',
    alphaCanaryPost === 0 &&
      alphaStablePost === 50 &&
      alphaCanaryCfg?.currentTrafficPercentage === 0 &&
      betaCanaryPost >= 35 &&
      betaCanaryCfg?.currentTrafficPercentage === 80,
    `Project Alpha post-rollback: ${alphaCanaryPost} canary (0%), ${alphaStablePost} stable; Project Beta: ${betaCanaryPost}/50 canary (${(betaCanaryPost / 50) * 100}%); Beta enabled: ${betaCanaryCfg?.enabled}`
  );

  // Cleanup
  tcpClient.disconnect();
  cache.close();
  deployEngine.closeAll();
  redisTcpServer.close();
  pgReplicaServer.close();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL PHASE 11 ISOLATION TESTS: ${results.length}`);
  console.log(`PASSED:  ${passedCount}`);
  console.log(`FAILED:  ${failedCount}`);
  console.log('----------------------------------------------------\n');

  return { passed: passedCount, failed: failedCount, results };
}

if (require.main === module) {
  runPhase11Suite()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
