'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSocket } from '@/lib/socket';
import type {
  ChatMessage,
  CurrentUser,
  JoinedPayload,
  RestoreMessagesPayload,
  RoomListPayload,
  RoomMember,
  RoomSummary,
  TypingPayload,
} from '@/lib/types';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import RightPanel, { AttachmentsSummary } from './RightPanel';

const TYPING_CLEAR_MS = 4000;

export default function ChatApp() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [usersById, setUsersById] = useState<Map<string, RoomMember>>(new Map());
  const [activeRoomID, setActiveRoomID] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [attachments, setAttachments] = useState<AttachmentsSummary | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Map<string, ChatMessage[]>>(new Map());
  const [typingByRoom, setTypingByRoom] = useState<Map<string, TypingPayload>>(new Map());

  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeRoomRef = useRef<string | null>(null);
  activeRoomRef.current = activeRoomID;

  // ---- bootstrap: who am I, then open the socket ----
  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unauthenticated'))))
      .then((me) => setCurrentUser({ id: me.id, username: me.username, first_name: me.first_name, last_name: me.last_name }))
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      socket.emit('userLoggedIn');
      socket.emit('roomList', {});
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onRoomList(payload: RoomListPayload) {
      setRooms(payload.room);
      setUsersById((prev) => {
        const next = new Map(prev);
        payload.users.forEach((u) => next.set(u._id, u));
        return next;
      });
    }
    function onJoined(payload: JoinedPayload) {
      setActiveRoom(payload.room);
      setMembers(payload.member_users);
      setUsersById((prev) => {
        const next = new Map(prev);
        payload.member_users.forEach((u) => next.set(u._id, u));
        return next;
      });
    }
    function onAttachmentsSummary({ roomID, summary }: { roomID: string; summary: AttachmentsSummary }) {
      if (roomID !== activeRoomRef.current) return; // stale response for a room we've since left
      setAttachments(summary);
    }
    function onRestoreMessages(payload: RestoreMessagesPayload) {
      if (payload.roomID !== activeRoomRef.current) return; // stale response for a room we've since left
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.set(payload.roomID, payload.messages);
        return next;
      });
    }
    function onChat(message: ChatMessage) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        const list = next.get(message.roomID) ?? [];
        if (list.some((m) => m.id === message.id)) return prev;
        next.set(message.roomID, [...list, message]);
        return next;
      });
      setRooms((prev) =>
        prev.map((r) => (r.roomID === message.roomID ? { ...r, lastMessage: { message: message.message }, lastUpdated: message.timestamp } : r))
      );
    }
    function onTyping(payload: TypingPayload) {
      const roomID = activeRoomRef.current;
      if (!roomID) return;
      setTypingByRoom((prev) => {
        const next = new Map(prev);
        if (payload.isTyping) next.set(roomID, payload);
        else next.delete(roomID);
        return next;
      });
      const timers = typingTimers.current;
      const existing = timers.get(roomID);
      if (existing) clearTimeout(existing);
      if (payload.isTyping) {
        timers.set(
          roomID,
          setTimeout(() => {
            setTypingByRoom((prev) => {
              const next = new Map(prev);
              next.delete(roomID);
              return next;
            });
          }, TYPING_CLEAR_MS)
        );
      }
    }
    function onError(payload: { message?: string }) {
      console.error('socket error', payload);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomList', onRoomList);
    socket.on('joined', onJoined);
    socket.on('attachmentsSummary', onAttachmentsSummary);
    socket.on('restoreMessages', onRestoreMessages);
    socket.on('chat', onChat);
    socket.on('typing', onTyping);
    socket.on('error', onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomList', onRoomList);
      socket.off('joined', onJoined);
      socket.off('attachmentsSummary', onAttachmentsSummary);
      socket.off('restoreMessages', onRestoreMessages);
      socket.off('chat', onChat);
      socket.off('typing', onTyping);
      socket.off('error', onError);
    };
  }, [currentUser]);

  const selectRoom = useCallback((roomID: string) => {
    setActiveRoomID(roomID);
    setAttachments(null);
    getSocket().emit('joinRoom', { roomID });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!activeRoomID) return;
      const socket = getSocket();
      const tempId = uuidv4();
      socket.emit('chat', { id: tempId, roomID: activeRoomID, message: text }, (ack: { success: boolean; message?: string }) => {
        if (!ack?.success) console.error('send failed', ack?.message);
      });
    },
    [activeRoomID]
  );

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeRoomID || !currentUser) return;
      getSocket().emit('typing', {
        username: currentUser.username,
        name: `${currentUser.first_name} ${currentUser.last_name}`,
        isTyping,
      });
    },
    [activeRoomID, currentUser]
  );

  const ownTypingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDraftChange = useCallback(
    (text: string) => {
      notifyTyping(text.length > 0);
      if (ownTypingStopTimer.current) clearTimeout(ownTypingStopTimer.current);
      if (text.length > 0) {
        ownTypingStopTimer.current = setTimeout(() => notifyTyping(false), TYPING_CLEAR_MS);
      }
    },
    [notifyTyping]
  );

  const unreadByRoom = useMemo(() => {
    const m = new Map<string, number>();
    rooms.forEach((r) => m.set(r.roomID, r.unreadCount ?? 0));
    return m;
  }, [rooms]);

  const typingLabelByRoom = useMemo(() => {
    const m = new Map<string, string>();
    typingByRoom.forEach((v, k) => m.set(k, v.name || v.username));
    return m;
  }, [typingByRoom]);

  const activeMessages = activeRoomID ? messagesByRoom.get(activeRoomID) ?? [] : [];
  const activeTyping = activeRoomID ? typingByRoom.get(activeRoomID) ?? null : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 md:p-6">
      <div className="flex h-[92vh] w-full max-w-[1440px] overflow-hidden rounded-xl2 bg-white shadow-2xl shadow-slate-900/10">
        <IconRail currentUser={currentUser} />
        <Sidebar
          currentUser={currentUser}
          rooms={rooms}
          usersById={usersById}
          activeRoomID={activeRoomID}
          unreadByRoom={unreadByRoom}
          typingByRoom={typingLabelByRoom}
          onSelectRoom={selectRoom}
        />
        <ChatWindow
          room={activeRoom}
          currentUser={currentUser}
          messages={activeMessages}
          members={members}
          usersById={usersById}
          typingUser={activeTyping}
          onSend={(text) => {
            sendMessage(text);
            notifyTyping(false);
          }}
          onDraftChange={handleDraftChange}
        />
        <RightPanel room={activeRoom} members={members} attachments={attachments} />
      </div>
      {!connected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs text-white">
          Connecting…
        </div>
      )}
    </div>
  );
}
