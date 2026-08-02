// ---------------------------------------------------------------------------
// Minimal async key-value storage interface. The web app backs this with
// localStorage (wrapped as async for a uniform API); the mobile app backs it
// with @react-native-async-storage/async-storage. Core hooks only ever talk
// to this interface, never to localStorage/AsyncStorage directly.
// ---------------------------------------------------------------------------

export interface KVStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let activeStorage: KVStorage | null = null;

export function setStorage(impl: KVStorage) {
  activeStorage = impl;
}

export function getStorage(): KVStorage {
  if (!activeStorage) {
    throw new Error(
      '[@metachat/core] No storage implementation registered. Call setStorage() once at app startup.'
    );
  }
  return activeStorage;
}
