import net from 'net';

async function main() {
  const socket = net.createConnection({ host: '127.0.0.1', port: 6379 });

  socket.on('connect', () => {
    console.log('TCP CONNECTED to 6379');
    socket.write('PING\r\n');
  });

  socket.on('data', (data) => {
    console.log('RESPONSE:', data.toString());
    socket.end();
  });

  socket.on('error', (err) => {
    console.log('CONNECT FAILED:', err.message);
  });

  socket.on('close', () => {
    console.log('SOCKET CLOSED');
  });
}

main();
