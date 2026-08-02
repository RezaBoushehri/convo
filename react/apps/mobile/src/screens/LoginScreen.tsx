import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import type { CurrentUser } from '@metachat/core';

export default function LoginScreen({ onLogin }: { onLogin: (u: CurrentUser) => void }) {
  const [username, setUsername] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>MetaChat</Text>
      <TextInput
        style={styles.input}
        placeholder="نام کاربری"
        value={username}
        onChangeText={setUsername}
        autoFocus
        textAlign="right"
      />
      <TouchableOpacity
        style={[styles.button, !username.trim() && styles.buttonDisabled]}
        disabled={!username.trim()}
        onPress={() => onLogin({ id: username.trim(), username: username.trim() })}
      >
        <Text style={styles.buttonText}>ورود</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f6f8' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  button: { backgroundColor: '#4a5cf5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
