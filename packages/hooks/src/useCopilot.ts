import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { SessionInfo } from '@3sc/types';

export interface CopilotMessage {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
  toolCallId?: string;
}

interface CopilotState {
  isOpen: boolean;
  messages: CopilotMessage[];
  isLoading: boolean;
  conversationId: string | null;
}

function useSession(): SessionInfo | null {
  return useSelector((state: { auth: { session: SessionInfo | null } }) => state.auth.session);
}

export function useCopilot() {
  const session = useSession();
  const [state, setState] = useState<CopilotState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    conversationId: null,
  });
  const socketRef = useRef<WebSocket | null>(null);

  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isOpen: false,
      messages: [],
      isLoading: false,
      conversationId: null,
    });
  }, []);

  const setConversationId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, conversationId: id }));
  }, []);

  const addMessage = useCallback((message: CopilotMessage) => {
    setState(prev => ({ ...prev, messages: [...prev.messages, message] }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  return {
    isOpen: state.isOpen,
    messages: state.messages,
    isLoading: state.isLoading,
    conversationId: state.conversationId,
    open,
    close,
    toggle,
    reset,
    setConversationId,
    addMessage,
    setLoading,
    clearMessages,
    isAuthenticated: !!session,
  };
}
