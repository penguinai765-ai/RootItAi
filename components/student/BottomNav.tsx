// components/student/BottomNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, User } from 'lucide-react';

const navItems = [
  { href: '/student/dashboard', icon: Home, label: 'Home' },
  { href: '/student/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/student/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-0 right-0 flex justify-center z-50 md:hidden">
      <div className="flex justify-around w-[95vw] max-w-md mx-auto bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl px-4 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center px-3 py-2 group">
              <Icon className={`w-7 h-7 mb-1 group-hover:text-purple-600 ${isActive ? 'text-purple-600' : 'text-gray-400'} transition-colors`} />
              <span className={`text-xs font-semibold group-hover:text-purple-600 ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
