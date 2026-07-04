import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RainbowBar } from '@/components/RainbowBar';

const navItems = [
  { href: '/admin', label: 'Дашборд', icon: '📊' },
  { href: '/admin/seasons', label: 'Сезоны', icon: '📅' },
  { href: '/admin/contracts', label: 'Контракты', icon: '📝' },
  { href: '/admin/protocols', label: 'Протоколы', icon: '⚠️' },
  { href: '/admin/tournaments', label: 'Турниры', icon: '🏆' },
  { href: '/admin/players', label: 'Игроки', icon: '👤' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Read token to verify (middleware already checked, but double-check)
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[rgba(96,128,255,0.1)] bg-bg-secondary min-h-screen p-4 flex flex-col">
        <div className="mb-8 px-2">
          <Link href="/" className="no-underline">
            <span className="font-heading font-extrabold text-lg tracking-[0.04em] uppercase text-text-primary crt-glow">
              ARC<span className="text-accent-primary">Raiders</span>
            </span>
          </Link>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.08em] mt-1 font-heading">Admin</p>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link text-sm py-2"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t border-[rgba(96,128,255,0.1)]">
          <Link href="/" className="nav-link text-xs py-2">
            ← На сайт
          </Link>
          <Link
            href="/admin/login"
            className="nav-link text-xs py-2 text-text-muted"
            onClick={() => {
              // Clear cookie on logout
              if (typeof document !== 'undefined') {
                document.cookie = 'admin_token=; path=/; max-age=0';
              }
            }}
          >
            Выйти
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
