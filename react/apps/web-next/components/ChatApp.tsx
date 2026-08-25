'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSocket } from '@/lib/socket';
import { uploadFiles } from '@/lib/upload';
import { withBasePath } from '@/lib/basePath';
import type {
  AckResponse,
  ChatMessage,
  CurrentUser,
  DeleteFilePayload,
  DeletePayload,
  EditPayload,
  JoinedPayload,
  ReactionAddedPayload,
  ReadMessageUpdatePayload,
  RestoreMessagesPayload,
  RoomListPayload,
  RoomMember,
  RoomSummary,
  TypingPayload,
  VoiceHearedPayload,
} from '@/lib/types';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import RightPanel, { AttachmentsSummary } from './RightPanel';
import ForwardDialog from './ForwardDialog';
import CallOverlay from './CallOverlay';
import IncomingCallToast from './IncomingCallToast';
import { useCall } from '@/hooks/useCall';

const TYPING_CLEAR_MS = 4000;

export default function ChatApp() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const call = useCall(currentUser);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [usersById, setUsersById] = useState<Map<string, RoomMember>>(new Map());
  const [activeRoomID, setActiveRoomID] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [attachments, setAttachments] = useState<AttachmentsSummary | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Map<string, ChatMessage[]>>(new Map());
  const [typingByRoom, setTypingByRoom] = useState<Map<string, TypingPayload>>(new Map());
  const [hasMoreOlderByRoom, setHasMoreOlderByRoom] = useState<Map<string, boolean>>(new Map());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeRoomRef = useRef<string | null>(null);
  activeRoomRef.current = activeRoomID;

  // ---- bootstrap: who am I, then open the socket ----
  useEffect(() => {
    fetch(withBasePath('/api/me'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unauthenticated'))))
      .then((me) => setCurrentUser({ id: me.id, username: me.username, first_name: me.first_name, last_name: me.last_name }))
      .catch(() => {
        window.location.href = withBasePath('/login');
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
      setHasMoreOlderByRoom((prev) => new Map(prev).set(payload.room.roomID, true));
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
        const existing = next.get(payload.roomID) ?? [];
        if (payload.join) {
          next.set(payload.roomID, payload.messages);
        } else if (payload.prepend) {
          const existingIds = new Set(existing.map((m) => m.id));
          next.set(payload.roomID, [...payload.messages.filter((m) => !existingIds.has(m.id)), ...existing]);
        } else {
          next.set(payload.roomID, payload.messages);
        }
        return next;
      });
    }
    function onNoMoreMessages({ roomID }: { roomID?: string }) {
      const id = roomID ?? activeRoomRef.current;
      if (!id) return;
      setHasMoreOlderByRoom((prev) => new Map(prev).set(id, false));
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
    function onEdit({ messageId, new_message }: EditPayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => {
          const idx = list.findIndex((m) => m.id === messageId);
          if (idx === -1) return;
          const copy = [...list];
          copy[idx] = { ...copy[idx], message: new_message, edited: new Date().toISOString() };
          next.set(roomID, copy);
        });
        return next;
      });
    }
    function onDelete({ messageId }: DeletePayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => next.set(roomID, list.filter((m) => m.id !== messageId)));
        return next;
      });
    }
    function onDeleteFile({ fileId, messageId }: DeleteFilePayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => {
          const idx = list.findIndex((m) => m.id === messageId);
          if (idx === -1) return;
          const copy = [...list];
          copy[idx] = { ...copy[idx], file: (copy[idx].file || []).filter((f) => f._id !== fileId) };
          next.set(roomID, copy);
        });
        return next;
      });
    }
    function onReactionAdded({ messageId, username, reaction }: ReactionAddedPayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => {
          const idx = list.findIndex((m) => m.id === messageId);
          if (idx === -1) return;
          const copy = [...list];
          const read = [...(copy[idx].read || [])];
          const existingIdx = read.findIndex((r) => r.username === username);
          if (existingIdx !== -1) read[existingIdx] = { ...read[existingIdx], reaction };
          else read.push({ username, reaction, time: new Date().toISOString() });
          copy[idx] = { ...copy[idx], read };
          next.set(roomID, copy);
        });
        return next;
      });
    }
    function onVoiceHeared({ file_id, messageId, username }: VoiceHearedPayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => {
          const idx = list.findIndex((m) => m.id === messageId);
          if (idx === -1) return;
          const copy = [...list];
          copy[idx] = {
            ...copy[idx],
            file: (copy[idx].file || []).map((f) =>
              f._id === file_id ? { ...f, heardBy: f.heardBy?.includes(username) ? f.heardBy : [...(f.heardBy || []), username] } : f
            ),
          };
          next.set(roomID, copy);
        });
        return next;
      });
    }
    function onReadMessageUpdate({ id, readUsers }: ReadMessageUpdatePayload) {
      setMessagesByRoom((prev) => {
        const next = new Map(prev);
        next.forEach((list, roomID) => {
          const idx = list.findIndex((m) => m.id === id);
          if (idx === -1) return;
          const copy = [...list];
          copy[idx] = { ...copy[idx], read: readUsers };
          next.set(roomID, copy);
        });
        return next;
      });
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
    socket.on('noMoreMessages', onNoMoreMessages);
    socket.on('chat', onChat);
    socket.on('edit', onEdit);
    socket.on('delete', onDelete);
    socket.on('delete_file', onDeleteFile);
    socket.on('reactionAdded', onReactionAdded);
    socket.on('update_voice_heared', onVoiceHeared);
    socket.on('readMessageUpdate', onReadMessageUpdate);
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
      socket.off('noMoreMessages', onNoMoreMessages);
      socket.off('chat', onChat);
      socket.off('edit', onEdit);
      socket.off('delete', onDelete);
      socket.off('delete_file', onDeleteFile);
      socket.off('reactionAdded', onReactionAdded);
      socket.off('update_voice_heared', onVoiceHeared);
      socket.off('readMessageUpdate', onReadMessageUpdate);
      socket.off('typing', onTyping);
      socket.off('error', onError);
    };
  }, [currentUser]);

  const selectRoom = useCallback((roomID: string) => {
    setActiveRoomID(roomID);
    setAttachments(null);
    setReplyTo(null);
    setEditingMessage(null);
    getSocket().emit('joinRoom', { roomID });
  }, []);

  // Mobile only: the sidebar and the open conversation share one screen
  // width below the md breakpoint, so "back" just clears the active room
  // to swap the conversation pane back out for the room list.
  const deselectRoom = useCallback(() => {
    setActiveRoomID(null);
    setAttachments(null);
    setReplyTo(null);
    setEditingMessage(null);
  }, []);

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

  const sendChat = useCallback(
    (payload: { message?: string; file?: unknown; forward?: string; quote?: string }) => {
      if (!activeRoomID) return;
      const socket = getSocket();
      const tempId = uuidv4();
      socket.emit('chat', { id: tempId, roomID: activeRoomID, ...payload }, (ack: AckResponse) => {
        if (!ack?.success) console.error('send failed', ack?.message);
      });
    },
    [activeRoomID]
  );

  const sendText = useCallback(
    (text: string) => {
      sendChat({ message: text, quote: replyTo?.id.split('-')[1] });
      setReplyTo(null);
      notifyTyping(false);
    },
    [sendChat, replyTo, notifyTyping]
  );

  const sendFiles = useCallback(
    async (files: File[], caption: string) => {
      try {
        setUploadProgress(0);
        const uploaded = await uploadFiles(files, setUploadProgress);
        sendChat({ message: caption, file: uploaded, quote: replyTo?.id.split('-')[1] });
        setReplyTo(null);
      } catch (err) {
        console.error('file send failed', err);
      } finally {
        setUploadProgress(null);
      }
    },
    [sendChat, replyTo]
  );

  const sendVoice = useCallback(
    async (blob: Blob) => {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      try {
        setUploadProgress(0);
        const uploaded = await uploadFiles([file], setUploadProgress);
        sendChat({ file: uploaded });
      } catch (err) {
        console.error('voice send failed', err);
      } finally {
        setUploadProgress(null);
      }
    },
    [sendChat]
  );

  const sendVideo = useCallback(
    async (blob: Blob) => {
      // "videonote" in the filename is how the composer/bubble tell a
      // round video message apart from a regular video attachment.
      const file = new File([blob], `videonote_${Date.now()}.webm`, { type: 'video/webm' });
      try {
        setUploadProgress(0);
        const uploaded = await uploadFiles([file], setUploadProgress);
        sendChat({ file: uploaded });
      } catch (err) {
        console.error('video note send failed', err);
      } finally {
        setUploadProgress(null);
      }
    },
    [sendChat]
  );

  const saveEdit = useCallback((messageId: string, text: string) => {
    getSocket().emit('edit', { messageId, new_message: text }, (ack: AckResponse) => {
      if (!ack?.success) console.error('edit failed', ack?.error);
    });
    setEditingMessage(null);
  }, []);

  const deleteMessage = useCallback((message: ChatMessage) => {
    if (!window.confirm('Delete this message?')) return;
    getSocket().emit('delete', { messageId: message.id }, (ack: AckResponse) => {
      if (!ack?.success) console.error('delete failed', ack?.error);
    });
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    getSocket().emit('addReaction', { messageId, reaction: emoji });
  }, []);

  const markVoiceHeard = useCallback((fileId: string) => {
    getSocket().emit('voice_heared', { file_id: fileId });
  }, []);

  const doForward = useCallback(
    (targetRoomID: string) => {
      if (!forwardMessage) return;
      const socket = getSocket();
      const tempId = uuidv4();
      socket.emit('chat', { id: tempId, roomID: targetRoomID, forward: forwardMessage.id }, (ack: AckResponse) => {
        if (!ack?.success) console.error('forward failed', ack?.message);
      });
      setForwardMessage(null);
    },
    [forwardMessage]
  );

  const loadOlderMessages = useCallback(() => {
    if (!activeRoomID) return;
    const list = messagesByRoom.get(activeRoomID);
    const oldest = list?.[0];
    if (!oldest) return;
    getSocket().emit('requestOlderMessages', { roomID: activeRoomID, beforeId: oldest.id });
  }, [activeRoomID, messagesByRoom]);

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
  const hasMoreOlder = activeRoomID ? hasMoreOlderByRoom.get(activeRoomID) ?? false : false;

  // Mark visible messages as read shortly after they load/arrive.
  useEffect(() => {
    if (!activeRoomID || !currentUser || activeMessages.length === 0) return;
    const unread = activeMessages.filter((m) => !(m.read || []).some((r) => r.username === currentUser.id)).map((m) => m.id);
    if (!unread.length) return;
    const t = setTimeout(() => {
      getSocket().emit('markMessagesRead', { roomID: activeRoomID, messageIds: unread });
      setRooms((prev) => prev.map((r) => (r.roomID === activeRoomID ? { ...r, unreadCount: 0 } : r)));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomID, activeMessages.length, currentUser]);

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
          hasMoreOlder={hasMoreOlder}
          onLoadOlder={loadOlderMessages}
          onReply={(m) => {
            setEditingMessage(null);
            setReplyTo(m);
          }}
          onForward={(m) => setForwardMessage(m)}
          onEdit={(m) => {
            setReplyTo(null);
            setEditingMessage(m);
          }}
          onDelete={deleteMessage}
          onReact={addReaction}
          onVoiceHeard={markVoiceHeard}
          onStartVoiceCall={() => call.startCall('audio')}
          onStartVideoCall={() => call.startCall('video')}
          callDisabled={!activeRoomID || call.phase !== 'idle'}
          onBack={deselectRoom}
          composerProps={{
            replyTo,
            onCancelReply: () => setReplyTo(null),
            editingMessage,
            onCancelEdit: () => setEditingMessage(null),
            onSendText: sendText,
            onSendFiles: sendFiles,
            onSendVoice: sendVoice,
            onSendVideo: sendVideo,
            onSaveEdit: saveEdit,
            onDraftChange: handleDraftChange,
            disabled: !activeRoomID,
            uploadProgress,
          }}
        />
        <RightPanel room={activeRoom} members={members} attachments={attachments} />
      </div>

      {forwardMessage && (
        <ForwardDialog
          rooms={rooms}
          currentUser={currentUser}
          usersById={usersById}
          onForward={doForward}
          onClose={() => setForwardMessage(null)}
        />
      )}

      {!connected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs text-white">
          Connecting…
        </div>
      )}

      {call.incomingCall && call.phase === 'incoming' && (
        <IncomingCallToast call={call.incomingCall} onAccept={call.acceptIncoming} onDecline={call.declineIncoming} />
      )}

      {(call.phase === 'outgoing' || call.phase === 'active') && (
        <CallOverlay
          currentUser={currentUser}
          callType={call.callType}
          participants={call.participants}
          localStream={call.localStream}
          remoteStreams={call.remoteStreams}
          connectionStates={call.connectionStates}
          muted={call.muted}
          cameraOff={call.cameraOff}
          elapsedMs={call.elapsedMs}
          onToggleMute={call.toggleMute}
          onToggleCamera={call.toggleCamera}
          onHangUp={call.hangUp}
        />
      )}

      {call.toast && (
        <div className="fixed bottom-4 left-1/2 z-[1095] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-1.5 text-xs text-white">
          {call.toast}
        </div>
      )}
    </div>
  );
}
