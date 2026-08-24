// Types for the real backend contract (ported from app.js), not the
// fictional one in react/packages/core/src/types.ts — see the Phase 1
// README for why this app doesn't reuse that package.

export interface CurrentUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface RoomMember {
  _id: string;
  username: string;
  first_name: string;
  last_name: string;
  lastActive?: string | null;
  status?: string | null;
}

export interface RoomSummary {
  _id: string;
  roomID: string;
  roomName: string;
  members: string[];
  setting?: Array<{ Joinable_url?: string; type?: string }>;
  lastUpdated?: string;
  createdAt?: string;
  lastMessage?: { message: string };
  unreadCount?: number;
}

export interface MessageFile {
  _id: string;
  file: string;
  fileType: string;
  fileName?: string | null;
  /** User ids who have played this voice/video note — client-tracked from `update_voice_heared` events. */
  heardBy?: string[];
}

export interface ReadEntry {
  username: string;
  reaction?: string;
  voice_heared?: boolean;
  time: string;
}

export interface ChatMessage {
  _id?: string;
  id: string;
  roomID: string;
  sender: string;
  message: string;
  quote?: string | null;
  forward?: { senderName?: string; senderUsername?: string | null; message?: string; file?: string | null } | null;
  reply?: { sender?: string; message?: string; file?: string | null } | null;
  file?: MessageFile[] | null;
  timestamp: string;
  edited?: string | null;
  read?: ReadEntry[];
  readUsers?: ReadEntry[];
  readLine?: boolean;
}

// Uploaded-file shape returned by POST /api/upload, before it's attached
// to a sent message.
export interface UploadedFile {
  file: string;
  fileName: string;
  fileType: string;
}

export interface TypingPayload {
  username: string;
  name?: string;
  status?: string;
  isTyping: boolean;
}

export interface JoinedPayload {
  room: RoomSummary;
  name: string;
  member_users: RoomMember[];
  otherUser: RoomMember | null;
}

export interface RestoreMessagesPayload {
  roomID: string;
  messages: ChatMessage[];
  prepend?: boolean;
  unread?: boolean;
  join?: boolean;
}

export interface RoomListPayload {
  room: RoomSummary[];
  users: RoomMember[];
  nextCursor: string | null;
  cache?: unknown;
}

export interface EditPayload {
  messageId: string;
  new_message: string;
}

export interface DeletePayload {
  messageId: string;
}

export interface DeleteFilePayload {
  fileId: string;
  messageId: string;
}

export interface ReactionAddedPayload {
  messageId: string;
  username: string;
  reaction: string;
}

export interface VoiceHearedPayload {
  file_id: string;
  username: string;
  messageId: string;
}

export interface ReadMessageUpdatePayload {
  id: string;
  readUsers: ReadEntry[];
}

export interface AckResponse {
  success: boolean;
  message?: string;
  error?: string;
}
