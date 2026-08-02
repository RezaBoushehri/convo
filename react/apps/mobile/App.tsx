import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorage } from '@metachat/core';
import RootNavigator from './src/RootNavigator';

// Register the native storage backend once, before anything in
// @metachat/core reads or writes the message queue.
setStorage({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});

export default function App() {
  return <RootNavigator />;
}
