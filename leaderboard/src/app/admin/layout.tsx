import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';

const navItems = [
  { href: '/admin', label: 'Дашборд' },
  { href: '/admin/seasons', label: 'Сезоны' },
  { href: '/admin/contracts', label: 'Контракты' },
  { href: '/admin/protocols', label: 'Протоколы' },
  { href: '/admin/tournaments', label: 'Турниры' },
  { href: '/admin/players', label: 'Игроки' },
  { href: '/admin/rules', label: 'Правила' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/login');

  return (
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[rgba(234,224,205,0.1)] bg-[#101116] min-h-screen p-4 flex flex-col">
        <div className="mb-8 px-2">
          <Link href="/" className="no-underline">
            <span className="font-heading font-extrabold text-lg tracking-[0.04em] uppercase text-[#eae0cd] [text-shadow:0_0_8px_rgba(0,229,255,0.3)]">
              ARC<span className="text-[#00e5ff]">Raiders</span>
            </span>
          </Link>
          <p className="text-[10px] text-[#8b867b] uppercase tracking-[0.08em] mt-1 font-heading">Admin</p>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-heading font-semibold text-[0.8rem] uppercase tracking-[0.05em] text-[#cfc7b7] px-4 py-2 rounded-md hover:text-[#eae0cd] hover:bg-[rgba(0,229,255,0.06)] transition-colors no-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t border-[rgba(234,224,205,0.1)]">
          <Link href="/" className="font-heading font-semibold text-xs uppercase tracking-[0.05em] text-[#cfc7b7] px-4 py-2 rounded-md hover:text-[#eae0cd] hover:bg-[rgba(0,229,255,0.06)] transition-colors no-underline block">
            ← На сайт
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
