'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className="nav-link text-xs py-2 text-text-muted bg-transparent border-none cursor-pointer w-full text-left">
      Выйти
    </button>
  );
}
