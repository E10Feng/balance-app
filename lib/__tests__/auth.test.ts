import { describe, it, expect, vi } from 'vitest';

// Mock next-auth and its dependencies before importing lib/auth
vi.mock('next-auth', () => ({
  default: (_config: unknown) => ({
    handlers: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('next-auth/providers/resend', () => ({
  default: (_config: unknown) => ({ id: 'resend', type: 'email' }),
}));

vi.mock('@auth/drizzle-adapter', () => ({
  DrizzleAdapter: () => ({}),
}));

vi.mock('../db', () => ({
  db: {},
}));

import { handlers } from '../auth';

describe('auth', () => {
  it('exports GET and POST handlers', () => {
    expect(handlers.GET).toBeDefined();
    expect(handlers.POST).toBeDefined();
  });
});
