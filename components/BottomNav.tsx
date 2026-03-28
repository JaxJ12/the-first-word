"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { session, isLoading } = useAuth();

  // Do not show on login page or if not authed yet
  if (pathname === '/login' || isLoading || !session) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: '⌂' },
    { label: 'Bible', href: '/bible', icon: '📖' },
    { label: 'Friends', href: '/friends', icon: '🫂' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#050505]/90 border-t border-zinc-900/50 backdrop-blur-md z-50 pb-safe">
      <nav className="flex justify-around items-center h-16 max-w-sm mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* Safe area padding for newer iPhones */}
      <div className="h-[env(safe-area-inset-bottom)] bg-[#050505]/90" />
    </div>
  );
}
