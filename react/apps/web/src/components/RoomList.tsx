import type { Room } from '@metachat/core';

interface Props {
  rooms: Room[];
  activeRoomID: string | null;
  onSelect: (roomID: string) => void;
}

export default function RoomList({ rooms, activeRoomID, onSelect }: Props) {
  if (rooms.length === 0) {
    return <div className="room-list-empty">گفتگویی وجود ندارد</div>;
  }

  return (
    <ul className="room-list">
      {rooms.map((room) => (
        <li
          key={room.roomID}
          className={`room-item ${room.roomID === activeRoomID ? 'active' : ''}`}
          onClick={() => onSelect(room.roomID)}
        >
          <span className="room-title">{room.title}</span>
          {room.lastMessage && (
            <span className="room-last-message">{room.lastMessage.text}</span>
          )}
          {room.unreadCount > 0 && <span className="room-unread-badge">{room.unreadCount}</span>}
        </li>
      ))}
    </ul>
  );
}
