import type { ChatMessage } from '@metachat/core';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onRetry: () => void;
}

export default function MessageBubble({ message, isOwn, onRetry }: Props) {
  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && <div className="message-sender">{message.sender}</div>}
      <div className="message-text" dir="auto">
        {message.text}
      </div>
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.createdAt).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {isOwn && message.status === 'pending' && <span className="message-status">در حال ارسال...</span>}
        {isOwn && message.status === 'failed' && (
          <button className="message-retry" onClick={onRetry}>
            ارسال مجدد
          </button>
        )}
      </div>
    </div>
  );
}
