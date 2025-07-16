// components/student/BottomNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, User } from 'lucide-react';

const navItems = [
  { href: '/student/dashboard', icon: Home, label: 'Home' },
  { href: '/student/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/student/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-t-md border-t">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center justify-center p-3 text-sm ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                <Icon className="w-6 h-6 mb-1" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
