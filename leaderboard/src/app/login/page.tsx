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
      const apiBase = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка входа');
      }

      const { token } = await res.json();
      document.cookie = `admin_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full bg-[#0a0a0c] border border-[rgba(234,224,205,0.15)] rounded-md px-3 py-2.5 text-sm text-[#eae0cd] placeholder:text-[#8b867b] focus:outline-none focus:border-[#00e5ff] transition-colors';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0c]">
      <div className="bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.12)] rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.32)] w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading font-extrabold text-2xl uppercase tracking-[0.04em] text-[#eae0cd] mb-1">
            ARC<span className="text-[#00e5ff]">Raiders</span>
          </h1>
          <p className="text-xs text-[#8b867b] uppercase tracking-[0.1em] font-heading">Админ-панель</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.06em] text-[#8b867b] font-heading mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={inputClass} placeholder="your@email.com" required autoFocus />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.06em] text-[#8b867b] font-heading mb-1.5">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className={inputClass} placeholder="••••••" required />
          </div>

          {error && <p className="text-xs text-[#ef4444] font-heading">{error}</p>}

          <button type="submit" disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-[#00e5ff] text-[#071015] font-heading font-bold text-sm uppercase tracking-[0.03em] py-3 px-7 rounded-md hover:bg-[#7ff4ff] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,229,255,0.3)] transition-all duration-200 disabled:opacity-50 mt-2">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-[10px] text-[#8b867b] text-center mt-6">
          Те же учётные данные, что и в админке оверлея
        </p>
      </div>
    </main>
  );
}
