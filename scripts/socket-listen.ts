// Headless Socket.IO client: prints every slot event the server broadcasts.
// Usage: npm run socket:listen [-- http://localhost:3000]
import { io } from 'socket.io-client';

const url = process.argv[2] ?? process.env.API_URL ?? 'http://localhost:3000';
const socket = io(url, { path: '/socket.io', transports: ['websocket'] });

socket.on('connect', () => console.log(`[connected] ${url} (id=${socket.id}) - waiting for slot.booked / slot.released ...`));
socket.on('connect_error', (err) => console.error(`[connect_error] ${err.message}`));
socket.on('disconnect', (reason) => console.log(`[disconnected] ${reason}`));
socket.onAny((event: string, payload: unknown) => {
  console.log(`${new Date().toISOString()}  ${event}  ${JSON.stringify(payload)}`);
});

process.on('SIGINT', () => {
  socket.close();
  process.exit(0);
});
