'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn('resend', { email, callbackUrl: '/' });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center p-8 max-w-md mx-auto">
      <h1 className="font-heading text-4xl font-semibold text-dark mb-2">
        Welcome to<br /><span className="italic text-primary">BalanceWell</span>
      </h1>
      <p className="text-mid text-xl mb-10">Enter your email to receive a sign-in link.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-dark text-xl font-medium">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full text-xl p-5 rounded-2xl border-2 border-primary-light bg-surface text-dark outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white text-xl font-semibold py-5 rounded-2xl mt-2 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send Sign-In Link'}
        </button>
      </form>
    </div>
  );
}
