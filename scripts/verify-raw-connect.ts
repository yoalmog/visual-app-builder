import { PostgresTcpClient } from '../src/builder/platform/production/PostgresDatabaseScalingProvider';

async function main() {
  const client = new PostgresTcpClient({ host: '127.0.0.1', port: 5432 });
  try {
    await client.connect();
    console.log('CONNECTED');
  } catch (err) {
    console.log('CONNECT FAILED:', err instanceof Error ? err.message : err);
  }
}

main();
