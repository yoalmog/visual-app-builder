// Dump raw autocannon JSON results
import autocannon from 'autocannon';
import { HttpOAuthProvider } from '../src/builder/platform/production/HttpOAuthProvider';
import { ProxyAdvancedDeploymentEngine } from '../src/builder/platform/production/ProxyAdvancedDeploymentEngine';
import { createInitialProject } from '../src/builder/persistence/project-storage';

async function main() {
  console.log('=== 1. OAUTH BENCHMARK RAW JSON ===');
  const oauth = new HttpOAuthProvider();
  const oauthPort = await oauth.startServer(0);
  const { app, rawClientSecret } = await oauth.createApp({
    organizationId: 'org_dump',
    name: 'Dump Client',
    description: 'test',
    redirectUris: ['http://127.0.0.1/cb'],
    scopes: ['read'],
    createdBy: 'admin',
  });
  const code = await oauth.generateAuthCode(app.clientId, 'http://127.0.0.1/cb', ['read'], 'usr_1');
  const tokens = await oauth.exchangeCodeForToken(code, app.clientId, rawClientSecret, 'http://127.0.0.1/cb');

  const oauthRaw = await autocannon({
    url: `http://127.0.0.1:${oauthPort}/oauth/userinfo`,
    connections: 50,
    duration: 3,
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  const oauthClean = {
    url: oauthRaw.url,
    connections: oauthRaw.connections,
    duration: oauthRaw.duration,
    errors: oauthRaw.errors,
    timeouts: oauthRaw.timeouts,
    non2xx: oauthRaw.non2xx,
    resets: oauthRaw.resets,
    mismatches: oauthRaw.mismatches,
    '1xx': (oauthRaw as any)['1xx'],
    '2xx': (oauthRaw as any)['2xx'],
    '3xx': (oauthRaw as any)['3xx'],
    '4xx': (oauthRaw as any)['4xx'],
    '5xx': (oauthRaw as any)['5xx'],
    statusCodeStats: oauthRaw.statusCodeStats,
    requests: oauthRaw.requests,
    latency: oauthRaw.latency,
    throughput: oauthRaw.throughput,
  };
  console.log(JSON.stringify(oauthClean, null, 2));

  console.log('\n=== 2. PROXY BENCHMARK RAW JSON ===');
  const deploy = new ProxyAdvancedDeploymentEngine();
  await deploy.initializeProxyCluster();
  const proxyPort = deploy.proxyPort;
  const dummyProj = createInitialProject('p_dump', 9);
  await deploy.deployCanary({
    projectId: 'p_dump',
    organizationId: 'org_dump',
    branch: 'main',
    commitId: 'c1',
    projectSnapshot: dummyProj,
    config: { currentTrafficPercentage: 50 },
  });

  const proxyRaw = await autocannon({
    url: `http://127.0.0.1:${proxyPort}/apps/p_dump`,
    connections: 50,
    duration: 3,
    headers: { 'X-Project-Id': 'p_dump' },
  });

  const proxyClean = {
    url: proxyRaw.url,
    connections: proxyRaw.connections,
    duration: proxyRaw.duration,
    errors: proxyRaw.errors,
    timeouts: proxyRaw.timeouts,
    non2xx: proxyRaw.non2xx,
    resets: proxyRaw.resets,
    mismatches: proxyRaw.mismatches,
    '1xx': (proxyRaw as any)['1xx'],
    '2xx': (proxyRaw as any)['2xx'],
    '3xx': (proxyRaw as any)['3xx'],
    '4xx': (proxyRaw as any)['4xx'],
    '5xx': (proxyRaw as any)['5xx'],
    statusCodeStats: proxyRaw.statusCodeStats,
    requests: proxyRaw.requests,
    latency: proxyRaw.latency,
    throughput: proxyRaw.throughput,
  };
  console.log(JSON.stringify(proxyClean, null, 2));

  console.log('\n=== 3. 1,000 CONCURRENT CONNECTIONS PROXY TIER RAW JSON ===');
  const proxy1000Raw = await autocannon({
    url: `http://127.0.0.1:${proxyPort}/apps/p_dump`,
    connections: 1000,
    duration: 3,
    timeout: 10,
    headers: { 'X-Project-Id': 'p_dump' },
  });

  const proxy1000Clean = {
    url: proxy1000Raw.url,
    connections: proxy1000Raw.connections,
    duration: proxy1000Raw.duration,
    errors: proxy1000Raw.errors,
    timeouts: proxy1000Raw.timeouts,
    non2xx: proxy1000Raw.non2xx,
    resets: proxy1000Raw.resets,
    mismatches: proxy1000Raw.mismatches,
    '1xx': (proxy1000Raw as any)['1xx'],
    '2xx': (proxy1000Raw as any)['2xx'],
    '3xx': (proxy1000Raw as any)['3xx'],
    '4xx': (proxy1000Raw as any)['4xx'],
    '5xx': (proxy1000Raw as any)['5xx'],
    statusCodeStats: proxy1000Raw.statusCodeStats,
    requests: proxy1000Raw.requests,
    latency: proxy1000Raw.latency,
    throughput: proxy1000Raw.throughput,
  };
  console.log(JSON.stringify(proxy1000Clean, null, 2));

  oauth.close();
  deploy.closeAll();
}

main().catch(console.error);
