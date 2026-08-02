import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import type { Room } from '@metachat/core';
import type { ConnectionStatus } from '@metachat/core';

interface Props {
  rooms: Room[];
  connectionStatus: ConnectionStatus;
  onSelectRoom: (roomID: string) => void;
}

export default function RoomListScreen({ rooms, connectionStatus, onSelectRoom }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>گفتگوها</Text>
        <Text style={[styles.status, statusColor(connectionStatus)]}>{connectionStatus}</Text>
      </View>
      {rooms.length === 0 ? (
        <Text style={styles.empty}>گفتگویی وجود ندارد</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.roomID}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.roomItem} onPress={() => onSelectRoom(item.roomID)}>
              <View style={styles.roomTextCol}>
                <Text style={styles.roomTitle}>{item.title}</Text>
                {item.lastMessage && (
                  <Text style={styles.roomLastMessage} numberOfLines={1}>
                    {item.lastMessage.text}
                  </Text>
                )}
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function statusColor(status: ConnectionStatus) {
  if (status === 'connected') return { color: '#1a9e4a' };
  if (status === 'connecting') return { color: '#999' };
  return { color: '#d43b3b' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  status: { fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  roomItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomTextCol: { flex: 1 },
  roomTitle: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  roomLastMessage: { fontSize: 13, color: '#888', textAlign: 'right' },
  badge: { backgroundColor: '#4a5cf5', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 11 },
});
