import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { SessionInfo, LoginCredentials } from '@3sc/types';
import { login as loginService, logout as logoutService, getSession } from '@3sc/auth';

interface AuthState {
  session: SessionInfo | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'user/login',
  async (credentials: LoginCredentials) => loginService(credentials),
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutService();
});

export const checkSession = createAsyncThunk('auth/checkSession', async (tenantId: string | number) => {
  return await getSession(tenantId);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.session = null;
      state.status = 'unauthenticated';
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = 'authenticated';
        sessionStorage.setItem('tenant_id', action.payload.tenantId);
        sessionStorage.setItem('user_id', action.payload.userId);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.error.message || 'Login failed';
      })
      .addCase(logout.fulfilled, (state) => {
        state.session = null;
        state.status = 'unauthenticated';
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = action.payload ? 'authenticated' : 'unauthenticated';
      })
      .addCase(checkSession.rejected, (state) => {
        state.status = 'unauthenticated';
      });
  },
});

export const { sessionExpired, clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;
