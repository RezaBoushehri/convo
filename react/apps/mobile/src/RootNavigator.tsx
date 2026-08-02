import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { useSocket, useRooms, type CurrentUser } from '@metachat/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import RoomListScreen from './screens/RoomListScreen';
import ChatScreen from './screens/ChatScreen';

// NOTE: this is a minimal hand-rolled navigator to keep the starter
// dependency-light. Swap in @react-navigation/native-stack once the app
// grows past 3 screens — the screen components below don't need to change.

const SOCKET_URL = (Constants.expoConfig?.extra?.socketUrl as string) ?? 'https://mc.farahoosh.ir/';

export default function RootNavigator() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeRoomID, setActiveRoomID] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('MC_currentUser').then((raw) => {
      if (raw) setCurrentUser(JSON.parse(raw));
      setRestoring(false);
    });
  }, []);

  const { socket, status } = useSocket({ url: SOCKET_URL }, currentUser);
  const rooms = useRooms(socket);

  if (restoring) return null;

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={async (user) => {
          await AsyncStorage.setItem('MC_currentUser', JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    );
  }

  if (activeRoomID) {
    return (
      <ChatScreen
        socket={socket}
        roomID={activeRoomID}
        currentUser={currentUser}
        onBack={() => setActiveRoomID(null)}
      />
    );
  }

  return (
    <RoomListScreen
      rooms={rooms}
      connectionStatus={status}
      onSelectRoom={setActiveRoomID}
    />
  );
}
