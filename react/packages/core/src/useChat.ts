import { useCallback, useEffect, useRef, useState } from 'react';
import type { MetaChatSocket } from './socketClient';
import type { ChatMessage, CurrentUser } from './types';
import { enqueueMessage, markSent, markFailed, getPendingMessages } from './messageQueue';

function makeTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat(
  socket: MetaChatSocket | null,
  roomID: string | null,
  currentUser: CurrentUser | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joining, setJoining] = useState(false);
  const roomIDRef = useRef(roomID);
  roomIDRef.current = roomID;

  // --- join room -----------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomID) return;
    setJoining(true);
    setMessages([]);
    socket.emit('joinRoom', { roomID });

    const onRoomJoined = (payload: { roomID: string; messages: ChatMessage[] }) => {
      if (payload.roomID !== roomID) return;
      setMessages(payload.messages.map((m) => ({ ...m, status: m.status ?? 'sent' })));
      setJoining(false);
    };

    socket.on('roomJoined', onRoomJoined);
    return () => {
      socket.off('roomJoined', onRoomJoined);
      socket.emit('leaveRoom', { roomID });
    };
  }, [socket, roomID]);

  // --- incoming messages -----------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const onMessage = (message: ChatMessage) => {
      if (message.roomID !== roomIDRef.current) return;
      setMessages((prev) => {
        // Reconcile with an optimistic message we already have locally.
        const existingIdx = prev.findIndex((m) => m.tempId === message.tempId);
        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = { ...message, status: 'sent' };
          return next;
        }
        return [...prev, { ...message, status: 'sent' }];
      });
    };

    const onAck = (payload: { tempId: string; id: string; createdAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === payload.tempId
            ? { ...m, id: payload.id, createdAt: payload.createdAt, status: 'sent' }
            : m
        )
      );
      markSent(payload.tempId);
    };

    socket.on('message', onMessage);
    socket.on('messageAck', onAck);
    return () => {
      socket.off('message', onMessage);
      socket.off('messageAck', onAck);
    };
  }, [socket]);

  // --- send with optimistic UI + offline queue -------------------------------
  const sendMessage = useCallback(
    async (text: string, replyTo?: string | null) => {
      if (!socket || !roomID || !currentUser || !text.trim()) return;

      const optimistic: ChatMessage = {
        tempId: makeTempId(),
        roomID,
        sender: currentUser.username,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        replyTo: replyTo ?? null,
      };

      setMessages((prev) => [...prev, optimistic]);
      await enqueueMessage(optimistic);

      if (socket.connected) {
        socket.emit('sendMessage', {
          roomID,
          text: optimistic.text,
          tempId: optimistic.tempId,
          replyTo: optimistic.replyTo,
        });
      }
      // If not connected, it stays queued; flushQueue() on reconnect will send it.
    },
    [socket, roomID, currentUser]
  );

  // --- flush queued messages once connection returns --------------------------
  useEffect(() => {
    if (!socket) return;
    const flush = async () => {
      const pending = await getPendingMessages();
      for (const item of pending.filter((m) => m.roomID === roomIDRef.current)) {
        socket.emit('sendMessage', {
          roomID: item.roomID,
          text: item.text,
          tempId: item.tempId,
          replyTo: item.replyTo,
        });
      }
    };
    socket.on('connect', flush);
    return () => {
      socket.off('connect', flush);
    };
  }, [socket]);

  const retryFailed = useCallback(
    async (tempId: string) => {
      const updated = await markFailed(tempId);
      if (!updated || !socket) return;
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, status: 'pending' } : m)));
      socket.emit('sendMessage', {
        roomID: updated.roomID,
        text: updated.text,
        tempId: updated.tempId,
        replyTo: updated.replyTo,
      });
    },
    [socket]
  );

  return { messages, joining, sendMessage, retryFailed };
}
