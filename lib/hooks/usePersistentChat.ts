'use client';
import { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

export const STORAGE_KEY = 'coach-messages';

function readStoredMessages(): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function usePersistentChat(options: Parameters<typeof useChat>[0]) {
  const initialMessages = useRef<UIMessage[] | undefined>(undefined);
  if (initialMessages.current === undefined) {
    initialMessages.current = readStoredMessages();
  }
  const chat = useChat({ ...options, messages: initialMessages.current });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat.messages));
    } catch {
      // sessionStorage unavailable or full — fail silently
    }
  }, [chat.messages]);

  return chat;
}
