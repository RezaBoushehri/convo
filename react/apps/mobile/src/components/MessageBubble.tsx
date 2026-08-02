import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChatMessage } from '@metachat/core';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onRetry: () => void;
}

export default function MessageBubble({ message, isOwn, onRetry }: Props) {
  return (
    <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
      {!isOwn && <Text style={styles.sender}>{message.sender}</Text>}
      <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.time, isOwn && styles.textOwn]}>
          {new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {isOwn && message.status === 'pending' && <Text style={styles.pending}>در حال ارسال...</Text>}
        {isOwn && message.status === 'failed' && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={styles.retry}>ارسال مجدد</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 14, marginBottom: 4 },
  own: { alignSelf: 'flex-end', backgroundColor: '#4a5cf5' },
  other: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  sender: { fontSize: 12, fontWeight: '700', color: '#4a5cf5', marginBottom: 2 },
  text: { fontSize: 15, color: '#111', textAlign: 'right' },
  textOwn: { color: '#fff' },
  metaRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  time: { fontSize: 10, opacity: 0.7 },
  pending: { fontSize: 10, opacity: 0.7, color: '#111' },
  retry: { fontSize: 10, textDecorationLine: 'underline', color: '#111' },
});
