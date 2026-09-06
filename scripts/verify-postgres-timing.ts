import net from 'net';
import { PostgresDatabaseScalingProvider, PostgresTcpClient } from '../src/builder/platform/production/PostgresDatabaseScalingProvider';

async function main() {
  // Stand up replica TCP wire server
  const server = net.createServer((socket) => {
    socket.on('data', (d) => {
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
        socket.write(Buffer.from('COLUMNS: id\n1\nCommandComplete\n', 'utf8'));
      }
    });
  });

  const port = await new Promise<number>((res) => {
    server.listen(0, '127.0.0.1', () => {
      res((server.address() as net.AddressInfo).port);
    });
  });

  const provider = new PostgresDatabaseScalingProvider({
    primary: { host: '127.0.0.1', port: 5432 },
    replicas: [
      { id: 'repl_alpha', regionId: 'us-west-2', host: '127.0.0.1', port },
      { id: 'repl_beta', regionId: 'eu-central-1', host: '127.0.0.1', port },
    ],
  });

  console.log('=== TEST A: What MT-004 Actually Executed: routeQuery() (In-Memory Routing) ===');
  const routeTimings: number[] = [];
  for (let i = 0; i < 25; i++) {
    const t0 = process.hrtime.bigint();
    await provider.routeQuery('read', 'eventual');
    const t1 = process.hrtime.bigint();
    const micros = Number(t1 - t0) / 1000;
    routeTimings.push(micros);
    console.log(`Query ${i + 1}: routeQuery() elapsed = ${micros.toFixed(2)} µs (${(micros / 1000).toFixed(4)} ms)`);
  }
  const avgRoute = routeTimings.reduce((a, b) => a + b, 0) / routeTimings.length;
  console.log(`Average routeQuery() time: ${avgRoute.toFixed(2)} µs (0.${Math.round(avgRoute)} ms)\n`);

  console.log('=== TEST B: Actual TCP Socket Query Execution: PostgresTcpClient.executeSimpleQuery() ===');
  const tcpClients: PostgresTcpClient[] = [];
  for (let i = 0; i < 25; i++) {
    const client = new PostgresTcpClient({ host: '127.0.0.1', port });
    await client.connect();
    tcpClients.push(client);
  }

  const tcpTimings: number[] = [];
  for (let i = 0; i < 25; i++) {
    const client = tcpClients[i];
    const t0 = process.hrtime.bigint();
    const res = await client.executeSimpleQuery('SELECT 1;');
    const t1 = process.hrtime.bigint();
    const millis = Number(t1 - t0) / 1_000_000;
    tcpTimings.push(millis);
    console.log(`Query ${i + 1}: TCP Socket Roundtrip = ${millis.toFixed(3)} ms (Response: "${res.trim()}")`);
  }
  const avgTcp = tcpTimings.reduce((a, b) => a + b, 0) / tcpTimings.length;
  console.log(`\nAverage TCP Socket Roundtrip: ${avgTcp.toFixed(3)} ms`);

  for (const c of tcpClients) c.disconnect();
  server.close();
}

main().catch(console.error);
