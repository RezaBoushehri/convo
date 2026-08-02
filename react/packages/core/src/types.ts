// ---------------------------------------------------------------------------
// Domain types shared between the web app and the React Native app.
// Keeping these in one place is what lets both UIs consume the exact same
// hooks/state without drifting apart.
// ---------------------------------------------------------------------------

export interface CurrentUser {
  id: string;
  username: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface ChatMessage {
  /** Server-assigned id. Absent while the message is still only local (optimistic). */
  id?: string;
  /** Client-generated id used to reconcile optimistic messages with the server echo. */
  tempId: string;
  roomID: string;
  sender: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  attempts?: number;
  replyTo?: string | null;
}

export interface Room {
  roomID: string;
  title: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface OnlineState {
  onlineUsernames: string[];
  sleepingUsernames: string[];
}

// ----------------------------- socket contract -----------------------------
// This is the event contract the client relies on. Since the backend can
// change, this is intentionally small and explicit — treat it as the source
// of truth to implement server-side, rather than reverse-engineering it from
// the old jQuery code's ad-hoc events.

export interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (err: Error) => void;

  roomJoined: (payload: { roomID: string; messages: ChatMessage[] }) => void;
  roomList: (rooms: Room[]) => void;
  message: (message: ChatMessage) => void;
  messageAck: (payload: { tempId: string; id: string; createdAt: string }) => void;

  onlineUsers: (usernames: string[]) => void;
  userWentSleep: (username: string) => void;
  userCameBack: (payload: { username: string; name?: string }) => void;

  notification: (payload: {
    title: string;
    message: string;
    roomID?: string;
    sender?: string;
  }) => void;
}

export interface ClientToServerEvents {
  userLoggedIn: (payload: { username: string; socketId?: string }) => void;
  joinRoom: (payload: { roomID: string }) => void;
  leaveRoom: (payload: { roomID: string }) => void;
  sendMessage: (payload: {
    roomID: string;
    text: string;
    tempId: string;
    replyTo?: string | null;
  }) => void;
  userSleep: () => void;
  userWake: () => void;
}
