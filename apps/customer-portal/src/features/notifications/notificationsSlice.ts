import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '@3sc/types';

interface NotificationsState {
  unreadCount: number;
  latestNotifications: Notification[];
}

const initialState: NotificationsState = { unreadCount: 0, latestNotifications: [] };

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.latestNotifications.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount++;
      state.latestNotifications = state.latestNotifications.slice(0, 20);
    },
    decrementUnread(state) {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    clearAll(state) {
      state.unreadCount = 0;
    },
  },
});

export const { setUnreadCount, addNotification, decrementUnread, clearAll } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
