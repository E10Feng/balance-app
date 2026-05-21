'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import CoachMei, { type MeiState } from '@/components/CoachMei';
import { useEffect, useRef, useState } from 'react';

const QUICK_REPLIES = [
  'What exercises do I have today?',
  'Is this exercise safe for me?',
  'Can I skip today?',
  'Make it easier',
  'Make it harder',
  'I feel pain',
];

export default function CoachPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/coach' }),
  });
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  const lastMsg = messages[messages.length - 1];
  const meiState: MeiState = isLoading ? 'thinking'
    : lastMsg?.role === 'assistant' ? 'speaking'
    : 'idle';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(text: string) {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-bg max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 pt-10 flex-shrink-0">
        <CoachMei state={meiState} size={64} />
        <div>
          <p className="font-heading text-2xl font-semibold text-dark">Coach Mei</p>
          <p className="text-secondary text-sm">● Online — ready to help</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="bg-surface rounded-2xl rounded-tl-sm p-4 text-lg text-dark self-start max-w-[85%]">
            Hello! 😊 I&apos;m Coach Mei, your balance coach. How are you feeling today?
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-4 rounded-2xl text-lg max-w-[85%] ${
              m.role === 'user'
                ? 'bg-primary text-white self-end rounded-tr-sm'
                : 'bg-surface text-dark self-start rounded-tl-sm'
            }`}
          >
            {m.parts
              .filter((p) => p.type === 'text')
              .map((p, i) => <span key={i}>{(p as { type: 'text'; text: string }).text}</span>)}
          </div>
        ))}
        {isLoading && (
          <div className="bg-surface rounded-2xl rounded-tl-sm p-4 text-lg text-mid self-start">
            <span className="animate-pulse">···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length === 0 && (
        <div className="px-6 pb-3 flex flex-wrap gap-2 flex-shrink-0">
          {QUICK_REPLIES.map((r) => (
            <button
              key={r}
              onClick={() => send(r)}
              className="bg-surface border-2 border-primary-light text-primary text-sm font-medium px-4 py-2.5 rounded-full"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 px-6 pb-6 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-xl p-4 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 flex-shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
