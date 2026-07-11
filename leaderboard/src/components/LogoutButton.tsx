'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className="font-heading font-semibold text-xs uppercase tracking-[0.05em] text-[#8b867b] hover:text-[#eae0cd] px-4 py-2 rounded-md bg-transparent border-none cursor-pointer w-full text-left transition-colors">
      Выйти
    </button>
  );
}
