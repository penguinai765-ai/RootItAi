// components/student/BottomNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, User, BookOpen, Target } from 'lucide-react';

const navItems = [
  { href: '/student/dashboard', icon: Home, label: 'Home' },
  { href: '/student/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/student/plan', icon: Target, label: 'Plan' },
  { href: '/student/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-3 left-0 right-0 flex justify-center z-50 md:hidden">
        <div className="flex justify-around w-[95vw] max-w-md mx-auto bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-2xl px-4 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-200 group ${isActive ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
              >
                <Icon
                  className={`w-6 h-6 mb-1 transition-all duration-200 ${isActive
                      ? 'text-purple-600 scale-110'
                      : 'text-gray-400 group-hover:text-purple-500 group-hover:scale-105'
                    }`}
                />
                <span
                  className={`text-xs font-semibold transition-all duration-200 ${isActive
                      ? 'text-purple-600'
                      : 'text-gray-500 group-hover:text-purple-500'
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-lg border-r border-gray-200/50 shadow-xl z-40">
        <div className="p-6">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              RootIt
            </h1>
            <p className="text-sm text-gray-500 mt-1">Student Portal</p>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50'
                      : 'hover:bg-gray-50'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 transition-all duration-200 ${isActive
                        ? 'text-purple-600'
                        : 'text-gray-400 group-hover:text-purple-500'
                      }`}
                  />
                  <span
                    className={`font-medium transition-all duration-200 ${isActive
                        ? 'text-purple-600'
                        : 'text-gray-700 group-hover:text-purple-500'
                      }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200/50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/student/quiz"
                className="flex items-center px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-purple-600 transition-all duration-200 group"
              >
                <BookOpen className="w-4 h-4 mr-3 text-gray-400 group-hover:text-purple-500" />
                Active Quizzes
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
