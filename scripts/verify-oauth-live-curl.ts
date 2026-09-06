import { HttpOAuthProvider } from '../src/builder/platform/production/HttpOAuthProvider';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function main() {
  const provider = new HttpOAuthProvider();
  const port = await provider.startServer(9876);
  console.log(`[HttpOAuthProvider] Listening on http://127.0.0.1:${port}`);

  const { app, rawClientSecret } = await provider.createApp({
    organizationId: 'org_enterprise_live',
    name: 'Live CLI Curl Tool',
    description: 'Direct curl verification',
    redirectUris: ['http://127.0.0.1:9876/callback'],
    scopes: ['read', 'write'],
    createdBy: 'sec_admin',
  });

  const authCode = await provider.generateAuthCode(
    app.clientId,
    'http://127.0.0.1:9876/callback',
    ['read', 'write'],
    'usr_live_curl'
  );

  console.log(`Client ID: ${app.clientId}`);
  console.log(`Client Secret: ${rawClientSecret}`);
  console.log(`Single-Use Auth Code: ${authCode}\n`);

  const payload = JSON.stringify({
    grant_type: 'authorization_code',
    code: authCode,
    client_id: app.clientId,
    client_secret: rawClientSecret,
    redirect_uri: 'http://127.0.0.1:9876/callback',
  });

  console.log('=== FIRST CURL REQUEST (Valid Code Exchange) ===');
  try {
    const { stdout, stderr } = await execAsync(
      `C:\\Windows\\System32\\curl.exe -i -s -X POST http://127.0.0.1:${port}/oauth/token -H "Content-Type: application/json" -d "${payload.replace(/"/g, '\\"')}"`
    );
    console.log(stdout || stderr);
  } catch (err: any) {
    console.log(err.stdout || err.message);
  }

  console.log('=== SECOND CURL REQUEST (Replay Attack - Code Burned) ===');
  try {
    const { stdout, stderr } = await execAsync(
      `C:\\Windows\\System32\\curl.exe -i -s -X POST http://127.0.0.1:${port}/oauth/token -H "Content-Type: application/json" -d "${payload.replace(/"/g, '\\"')}"`
    );
    console.log(stdout || stderr);
  } catch (err: any) {
    console.log(err.stdout || err.message);
  }

  provider.close();
}

main().catch(console.error);
