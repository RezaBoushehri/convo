import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChat, type CurrentUser, type MetaChatSocket } from '@metachat/core';
import MessageBubble from '../components/MessageBubble';

interface Props {
  socket: MetaChatSocket | null;
  roomID: string;
  currentUser: CurrentUser;
  onBack: () => void;
}

export default function ChatScreen({ socket, roomID, currentUser, onBack }: Props) {
  const { messages, joining, sendMessage, retryFailed } = useChat(socket, roomID, currentUser);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ بازگشت</Text>
        </TouchableOpacity>
        {joining && <Text style={styles.loading}>در حال بارگذاری...</Text>}
      </View>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.tempId}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.sender === currentUser.username}
              onRetry={() => retryFailed(item.tempId)}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="پیام..."
            textAlign="right"
          />
          <TouchableOpacity style={[styles.sendButton, !draft.trim() && styles.sendDisabled]} onPress={submit} disabled={!draft.trim()}>
            <Text style={styles.sendButtonText}>ارسال</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  flexOne: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  backButton: { fontSize: 16, color: '#4a5cf5' },
  loading: { color: '#999', fontSize: 12 },
  messageList: { padding: 12, gap: 8 },
  inputRow: { flexDirection: 'row-reverse', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  sendButton: { backgroundColor: '#4a5cf5', borderRadius: 20, paddingHorizontal: 18, justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
