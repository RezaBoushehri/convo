import { useEffect, useState } from 'react';
import type { MetaChatSocket } from './socketClient';
import type { Room } from './types';

export function useRooms(socket: MetaChatSocket | null) {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!socket) return;

    const onRoomList = (list: Room[]) => setRooms(list);
    socket.on('roomList', onRoomList);

    return () => {
      socket.off('roomList', onRoomList);
    };
  }, [socket]);

  return rooms;
}
