// Phase 11: Real Load Testing & Saturation Breaking-Point Profiling
// @ts-ignore
import autocannon from 'autocannon';
import { HttpOAuthProvider } from '../src/builder/platform/production/HttpOAuthProvider';
import { ProxyAdvancedDeploymentEngine } from '../src/builder/platform/production/ProxyAdvancedDeploymentEngine';
import { createInitialProject } from '../src/builder/persistence/project-storage';

export interface LoadTierResult {
  connections: number;
  requestsSec: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRatePercent: number;
  non2xxCount: number;
  totalRequests: number;
}

export async function runLoadTests(): Promise<{
  oauthResult: autocannon.Result;
  proxyResult: autocannon.Result;
  breakingPointTable: LoadTierResult[];
  breakingPoint: LoadTierResult | null;
}> {
  console.log('================================================================');
  console.log('PHASE 11: REAL LOAD TESTING & SATURATION PROFILING');
  console.log('Load Generation Engine: autocannon v8.0.0 (High-Performance HTTP Benchmarker)');
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Benchmark HttpOAuthProvider (/oauth/userinfo with Bearer token)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Benchmarking HttpOAuthProvider over Real TCP Socket ---');
  const oauthProvider = new HttpOAuthProvider();
  const oauthPort = await oauthProvider.startServer(0);
  console.log(`[HttpOAuthProvider] Listening on http://127.0.0.1:${oauthPort}`);

  const { app, rawClientSecret } = await oauthProvider.createApp({
    organizationId: 'org_loadtest',
    name: 'Autocannon Benchmark Client',
    description: 'High concurrency benchmarking',
    redirectUris: ['http://127.0.0.1/callback'],
    scopes: ['read', 'write'],
    createdBy: 'load_tester',
  });

  const code = await oauthProvider.generateAuthCode(app.clientId, 'http://127.0.0.1/callback', ['read', 'write'], 'usr_load');
  const tokens = await oauthProvider.exchangeCodeForToken(code, app.clientId, rawClientSecret, 'http://127.0.0.1/callback');

  console.log('Executing autocannon: 50 concurrent connections, duration: 4s on /oauth/userinfo...\n');

  const oauthResult = await autocannon({
    url: `http://127.0.0.1:${oauthPort}/oauth/userinfo`,
    connections: 50,
    duration: 4,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });

  console.log(autocannon.printResult(oauthResult, { renderResultsTable: true }));

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Benchmark ProxyAdvancedDeploymentEngine (Traffic Splitting Reverse Proxy)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Benchmarking ProxyAdvancedDeploymentEngine Reverse Proxy ---');
  const deployEngine = new ProxyAdvancedDeploymentEngine();
  await deployEngine.initializeProxyCluster();
  const proxyPort = deployEngine.proxyPort;
  console.log(`[ProxyAdvancedDeploymentEngine] Ingress listening on http://127.0.0.1:${proxyPort}`);

  const dummyProj = createInitialProject('p_load', 9);
  await deployEngine.deployCanary({
    projectId: 'p_load',
    organizationId: 'org_load',
    branch: 'main',
    commitId: 'commit_l1',
    projectSnapshot: dummyProj,
    config: { currentTrafficPercentage: 50 },
  });

  console.log('Executing autocannon: 50 concurrent connections, duration: 4s on /apps/p_load...\n');

  const proxyResult = await autocannon({
    url: `http://127.0.0.1:${proxyPort}/apps/p_load`,
    connections: 50,
    duration: 4,
    headers: {
      'X-Project-Id': 'p_load',
    },
  });

  console.log(autocannon.printResult(proxyResult, { renderResultsTable: true }));

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Step-Concurrency Profiling to Identify Breaking Point
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Step-Concurrency Stress Profiling: Identifying System Breaking Point ---');
  console.log('Testing concurrency tiers: 10, 50, 100, 250, 500, 1000 connections...\n');

  const tiers = [10, 50, 100, 250, 500, 1000];
  const breakingPointTable: LoadTierResult[] = [];
  let breakingPoint: LoadTierResult | null = null;

  for (const conns of tiers) {
    process.stdout.write(`Benchmarking tier concurrency: ${conns} connections... `);
    const result = await autocannon({
      url: `http://127.0.0.1:${proxyPort}/apps/p_load`,
      connections: conns,
      duration: 3,
      timeout: 5,
      headers: {
        'X-Project-Id': 'p_load',
      },
    });

    const totalReqs = result.requests.total;
    const reqsSec = result.requests.average;
    const p50 = result.latency.p50;
    const p95 = result.latency.p95 || (result.latency as any)['95'] || result.latency.p97_5 || 0;
    const p99 = result.latency.p99 || (result.latency as any)['99'] || result.latency.max;
    const non2xx = result.non2xx;
    const errorRate = totalReqs > 0 ? (non2xx / totalReqs) * 100 : 0;

    const row: LoadTierResult = {
      connections: conns,
      requestsSec: Math.round(reqsSec),
      p50Ms: Math.round(p50 * 10) / 10,
      p95Ms: Math.round(p95 * 10) / 10,
      p99Ms: Math.round(p99 * 10) / 10,
      errorRatePercent: Math.round(errorRate * 100) / 100,
      non2xxCount: non2xx,
      totalRequests: totalReqs,
    };

    breakingPointTable.push(row);
    console.log(`Done. Req/s: ${row.requestsSec}, p50: ${row.p50Ms}ms, p99: ${row.p99Ms}ms, Errors: ${row.errorRatePercent}%`);

    // Flag breaking point if errorRate > 0% or p99 > 250ms or socket errors appear
    if (!breakingPoint && (row.errorRatePercent > 0 || row.p99Ms > 150 || result.errors > 0 || result.timeouts > 0)) {
      breakingPoint = row;
    }
  }

  // Cleanup
  oauthProvider.close();
  deployEngine.closeAll();

  // Print breaking point summary table
  console.log('\n================================================================');
  console.log('BREAKING POINT ANALYSIS: CONCURRENCY VS LATENCY VS ERROR RATE');
  console.log('================================================================');
  console.log('| Concurrency | Req / Sec | p50 (ms) | p95 (ms) | p99 (ms) | Errors (%) | Status |');
  console.log('|-------------|-----------|----------|----------|----------|------------|--------|');
  for (const r of breakingPointTable) {
    const isBreaking = breakingPoint && breakingPoint.connections === r.connections;
    const status = isBreaking ? '⚠️ SATURATION POINT' : r.errorRatePercent > 0 ? '❌ DEGRADED' : '✅ HEALTHY';
    console.log(
      `| ${r.connections.toString().padEnd(11)} | ${r.requestsSec.toString().padEnd(9)} | ${r.p50Ms.toString().padEnd(8)} | ${r.p95Ms.toString().padEnd(8)} | ${r.p99Ms.toString().padEnd(8)} | ${r.errorRatePercent.toString().padEnd(10)} | ${status} |`
    );
  }
  console.log('================================================================\n');

  if (breakingPoint) {
    console.log(`[ANALYSIS] Identified Breaking Point at Concurrency Tier: ${breakingPoint.connections} connections`);
    console.log(`           Observed: p99 latency ${breakingPoint.p99Ms}ms, throughput ${breakingPoint.requestsSec} req/sec`);
  } else {
    console.log(`[ANALYSIS] System remained within sub-150ms p99 latency ceiling up to 1000 concurrent connections.`);
  }

  return { oauthResult, proxyResult, breakingPointTable, breakingPoint };
}

if (require.main === module) {
  runLoadTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal load test error:', err);
      process.exit(1);
    });
}
