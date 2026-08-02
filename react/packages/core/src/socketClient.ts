import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './types';

export type MetaChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: MetaChatSocket | null = null;

export interface CreateSocketOptions {
  url: string;
  path?: string;
  getToken?: () => string | null | Promise<string | null>;
}

/**
 * Creates (once) and returns the shared socket instance.
 * Safe to call from both web and React Native — transport selection and
 * storage of the token are the only platform-specific bits, and those are
 * injected via `getToken`.
 */
export function getSocket(options: CreateSocketOptions): MetaChatSocket {
  if (socket) return socket;

  socket = io(options.url, {
    path: options.path ?? '/metachat/socket.io',
    transports: ['websocket', 'polling'],
    secure: true,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: false,
    auth: async (cb) => {
      const token = options.getToken ? await options.getToken() : null;
      cb({ token });
    },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
