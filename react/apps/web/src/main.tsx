import React from 'react';
import ReactDOM from 'react-dom/client';
import { setStorage } from '@metachat/core';
import App from './App';

// Register the web storage backend once, before anything in @metachat/core
// reads or writes the message queue.
setStorage({
  async getItem(key) {
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    window.localStorage.removeItem(key);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
