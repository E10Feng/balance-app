import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock @ai-sdk/react so we control the messages array
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(({ initialMessages }: { initialMessages?: unknown[] }) => ({
    messages: initialMessages ?? [],
    sendMessage: vi.fn(),
    status: 'idle' as const,
  })),
}));

import { usePersistentChat } from '../hooks/usePersistentChat';
import { DefaultChatTransport } from 'ai';

const transport = new DefaultChatTransport({ api: '/api/coach' });

describe('usePersistentChat', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty messages when sessionStorage is empty', () => {
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual([]);
  });

  it('reads initial messages from sessionStorage', () => {
    const stored = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }];
    sessionStorage.setItem('coach-messages', JSON.stringify(stored));
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual(stored);
  });

  it('handles corrupt sessionStorage gracefully', () => {
    sessionStorage.setItem('coach-messages', 'not-valid-json{{{');
    const { result } = renderHook(() => usePersistentChat({ transport }));
    expect(result.current.messages).toEqual([]);
  });
});
