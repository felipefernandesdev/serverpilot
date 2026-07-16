'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Server, LayoutDashboard, Users, Package, Activity,
  LogOut, Moon, Sun, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Users },
  { href: '/packages', label: 'Packages', icon: Package },
  { href: '/server-status', label: 'Server Status', icon: Activity },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    setDark(document.documentElement.classList.contains('dark'));
  }, [router]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } flex-shrink-0 bg-surface-900 dark:bg-surface-950 text-white transition-all duration-200 flex flex-col`}
      >
        <div className="flex items-center h-16 px-4 border-b border-surface-700">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="ml-3 font-bold text-lg">ServerHQ</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-surface-700 p-2 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-surface-300 hover:bg-surface-800 hover:text-white transition"
          >
            {dark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {!collapsed && <span className="text-sm">{dark ? 'Light' : 'Dark'}</span>}
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-surface-400 truncate">{user?.role}</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-surface-400 hover:text-white transition flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full px-3 py-1.5 rounded-lg text-surface-400 hover:bg-surface-800 hover:text-white transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
