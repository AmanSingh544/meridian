import { configureStore } from '@reduxjs/toolkit';
import { api } from '@3sc/api';
import { authReducer } from '../features/auth/authSlice';
import { notificationsReducer } from '../features/notifications/notificationsSlice';
import { realtimeReducer } from '../features/realtime/realtimeSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    notifications: notificationsReducer,
    realtime: realtimeReducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(api.middleware),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
