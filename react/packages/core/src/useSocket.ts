import { useEffect, useRef, useState } from 'react';
import { getSocket, type MetaChatSocket, type CreateSocketOptions } from './socketClient';
import type { CurrentUser } from './types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useSocket(options: CreateSocketOptions, currentUser: CurrentUser | null) {
  const socketRef = useRef<MetaChatSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  if (!socketRef.current) {
    socketRef.current = getSocket(options);
  }

  useEffect(() => {
    const socket = socketRef.current!;

    const onConnect = () => {
      setStatus('connected');
      if (currentUser) {
        socket.emit('userLoggedIn', { username: currentUser.username, socketId: socket.id });
      }
    };
    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  return { socket: socketRef.current, status };
}
