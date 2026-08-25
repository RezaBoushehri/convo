'use client';

import { io, Socket } from 'socket.io-client';
import { withBasePath } from './basePath';

let socket: Socket | null = null;

// Session-cookie authenticated (see server.js's io.use()) — no bearer
// token needed, the browser sends the same cookies it uses for the page.
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: withBasePath('/socket.io/'),
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
