'use client';
import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

const STORAGE_KEY = 'coach-messages';

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
  const chat = useChat({ ...options, initialMessages: readStoredMessages() });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat.messages));
    } catch {
      // sessionStorage unavailable or full — fail silently
    }
  }, [chat.messages]);

  return chat;
}
