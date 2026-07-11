'use client';

import { useState, useEffect } from 'react';
import { getApiBase, getAdminToken } from '@/lib/admin-helpers';

function getToken() { return getAdminToken(); }

export default function AdminRulesPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/rules`);
      const data = await res.json();
      setText(data.text || '');
    } catch { setText(''); }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const token = getToken();
      const res = await fetch(`${getApiBase()}/api/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Ошибка сохранения');
      setMessage('Сохранено!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err: any) { setMessage(err.message); }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="py-10">
        <div className="skeleton w-60 h-6 mb-4" />
        <div className="skeleton w-full h-96" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Редактирование правил</h1>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-xs ${message === 'Сохранено!' ? 'text-accent-green' : 'text-danger'}`}>
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-4">
        Редактируйте текст правил турнира. Поддерживается Markdown. Изменения сразу отобразятся на публичной странице /rules.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        className="w-full h-[600px] bg-bg-secondary border border-[rgba(234, 224, 205,0.2)] rounded-lg p-4 text-sm text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-accent-primary transition-colors"
        placeholder="Введите текст правил..."
        spellCheck={false}
      />

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-text-muted">
          {text.length.toLocaleString()} символов · {text.split(/\n/).length.toLocaleString()} строк
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
