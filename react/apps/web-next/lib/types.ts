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

export interface ChatMessage {
  _id?: string;
  id: string;
  roomID: string;
  sender: string;
  message: string;
  quote?: string | null;
  forward?: { senderName?: string; message?: string } | null;
  reply?: { sender?: string; message?: string; file?: string | null } | null;
  file?: Array<{ file: string; fileType: string; fileName?: string | null }> | null;
  timestamp: string;
  readUsers?: Array<{ username: string; time: string }>;
  readLine?: boolean;
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
