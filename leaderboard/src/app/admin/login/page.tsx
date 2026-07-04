'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка входа');
      }

      const { token } = await res.json();

      // Set cookie with 30-day expiry (matches session TTL)
      document.cookie = `admin_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="dark-panel w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading font-extrabold text-2xl uppercase tracking-[0.04em] text-text-primary mb-1">
            ARC<span className="text-accent-primary">Raiders</span>
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-[0.1em] font-heading">Админ-панель</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.06em] text-text-muted font-heading mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.06em] text-text-muted font-heading mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-danger font-heading">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-[10px] text-text-muted text-center mt-6">
          Те же учётные данные, что и в админке оверлея
        </p>
      </div>
    </main>
  );
}
