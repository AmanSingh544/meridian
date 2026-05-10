import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AIChatPanel, AIChatLauncher, AIToolCallIndicator } from '@3sc/ui';
import type { ChatMessage } from '@3sc/ui';
import {
  useCreateCopilotSessionMutation,
  useGetCopilotSessionsQuery,
  useGetCopilotHistoryQuery,
  useRenameCopilotSessionMutation,
  useDeleteCopilotSessionMutation,
} from '@3sc/api';
import { getCopilotSocketClient, type CopilotStreamEvent } from '@3sc/realtime';
import { usePermissions, usePageContext } from '@3sc/hooks';
import { Permission } from '@3sc/types';

function getQuickActions(pathname: string, entityType?: string, entityId?: string): string[] {
  if (entityType === 'ticket' && entityId) {
    return ['Summarize this ticket', 'Draft a reply', 'Find similar tickets', 'Who should this go to?', 'Escalate this ticket'];
  }
  if (entityType === 'project' && entityId) {
    return ['Project health check', "What's blocking us?", 'Predicted delivery date', 'List open tickets'];
  }
  if (pathname.startsWith('/tickets/')) {
    return ['Summarize this ticket', 'Draft a reply', 'Find similar tickets', 'Who should this go to?'];
  }
  if (pathname.startsWith('/projects/')) {
    return ['Project health check', "What's blocking us?", 'Predicted delivery date'];
  }
  if (pathname === '/tickets' || pathname === '/tickets/') {
    return ['Show tickets overdue', 'Summarize bugs this week', 'Create ticket for...'];
  }
  if (pathname === '/dashboard') {
    return ["Today's priorities", 'Any SLA breaches?', 'Team workload'];
  }
  if (pathname === '/knowledge') {
    return ['Search KB for...', 'What articles are missing?'];
  }
  return ['Show my tickets', 'Any SLA breaches?', 'Search knowledge base'];
}

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<string[] | null>(null);
  const location = useLocation();
  const permissions = usePermissions();
  const socketRef = useRef(getCopilotSocketClient());
  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingRef = useRef(false);

  const pageContext = usePageContext();
  const { entityType, entityId } = pageContext;
  const quickActions = getQuickActions(location.pathname, entityType, entityId);

  // Conversation management
  const { data: sessions = [] } = useGetCopilotSessionsQuery({ limit: 30 }, { skip: !isOpen });
  const { data: historyMessages = [] } = useGetCopilotHistoryQuery(conversationId!, {
    skip: !conversationId || messages.length > 0,
  });
  const [createSession] = useCreateCopilotSessionMutation();
  const [renameSession] = useRenameCopilotSessionMutation();
  const [deleteSession] = useDeleteCopilotSessionMutation();

  // Keep messagesRef in sync for event handlers
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load history when switching conversations
  useEffect(() => {
    if (historyMessages.length > 0 && conversationId) {
      setMessages(
        historyMessages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'tool',
          content: m.content,
          toolCalls: m.toolCalls,
          toolCallId: m.toolCallId,
        })),
      );
    }
  }, [historyMessages, conversationId]);

  // Connect socket on mount
  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    const unsubscribe = socket.onEvent((event: CopilotStreamEvent) => {
      switch (event.type) {
        case 'token':
          streamingRef.current = true;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && !last.toolCalls) {
              return [...prev.slice(0, -1), { ...last, content: last.content + event.content }];
            }
            return [...prev, { role: 'assistant', content: event.content }];
          });
          break;
        case 'tool_start':
          setActiveTools(event.tools);
          break;
        case 'tool_end':
          // Briefly show the done state so the user sees the tool completed
          setActiveTools((prev) => prev);  // keep label visible
          setTimeout(() => setActiveTools(null), 800);
          break;
        case 'draft':
          streamingRef.current = false;
          setActiveTools(null);
          setMessages((prev) => {
            // Replace any empty streaming assistant message
            const filtered = prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && m.content === ''));
            return [...filtered, { role: 'assistant', content: JSON.stringify({ type: 'draft', data: event.draft }) }];
          });
          setIsLoading(false);
          break;
        case 'done':
          streamingRef.current = false;
          setIsLoading(false);
          setActiveTools(null);
          break;
        case 'error':
          streamingRef.current = false;
          setIsLoading(false);
          setActiveTools(null);
          setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${event.message}` }]);
          break;
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, []);

  const ensureSession = useCallback(async () => {
    if (conversationId) return conversationId;
    const result = await createSession({
      context: {
        page: pageContext.page,
        entityType: pageContext.entityType,
        entityId: pageContext.entityId,
      },
    }).unwrap();
    const id = (result as any)?.id ?? (result as any)?.data?.id;
    if (id) {
      setConversationId(id);
      return id;
    }
    return null;
  }, [conversationId, createSession, pageContext]);

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    streamingRef.current = false;

    const sessionId = await ensureSession();
    if (!sessionId) {
      setIsLoading(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to create session' }]);
      return;
    }

    socketRef.current.sendChat(sessionId, text, {
      page: pageContext.page,
      entityType: pageContext.entityType,
      entityId: pageContext.entityId,
    });
  }, [ensureSession, pageContext]);

  const handleConfirmDraft = useCallback((tool: string, payload: Record<string, unknown>) => {
    if (!conversationId) return;
    setIsLoading(true);
    // Execute draft and stream the LLM's acknowledgement — all via the socket.
    // The gateway runs executeDraft then immediately streams a follow-up response.
    socketRef.current.executeDraft(conversationId, tool, payload, {
      page: pageContext.page,
      entityType: pageContext.entityType,
      entityId: pageContext.entityId,
    });
    // isLoading and messages are updated by incoming 'token'/'done'/'error' socket events
  }, [conversationId, pageContext]);

  const handleSelectConversation = useCallback((id: string) => {
    setConversationId(id);
    setMessages([]);
    setIsLoading(false);
    setActiveTools(null);
  }, []);

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setIsLoading(false);
    setActiveTools(null);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteSession(id).unwrap();
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
  }, [deleteSession, conversationId]);

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    await renameSession({ conversationId: id, title }).unwrap();
  }, [renameSession]);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!permissions.has(Permission.AI_COPILOT_CHAT)) return null;

  return (
    <>
      <AIChatLauncher onClick={() => setIsOpen(true)} />
      <AIChatPanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        onSend={handleSend}
        onConfirmDraft={permissions.has(Permission.AI_COPILOT_WRITE) ? handleConfirmDraft : undefined}
        isLoading={isLoading}
        quickActions={messages.length === 0 ? quickActions : []}
        indicator={activeTools ? <AIToolCallIndicator tools={activeTools} status="running" /> : undefined}
        conversations={sessions}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />
    </>
  );
};
