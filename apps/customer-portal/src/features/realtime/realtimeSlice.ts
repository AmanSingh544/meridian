import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionStatus } from '@3sc/realtime';

interface RealtimeState {
  connectionStatus: ConnectionStatus;
}

const initialState: RealtimeState = { connectionStatus: 'disconnected' };

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setConnectionStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.connectionStatus = action.payload;
    },
  },
});

export const { setConnectionStatus } = realtimeSlice.actions;
export const realtimeReducer = realtimeSlice.reducer;
