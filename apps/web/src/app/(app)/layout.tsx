'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Globe, LayoutDashboard, FolderOpen, Mail, Database,
  LogOut, Moon, Sun, ChevronLeft, ChevronRight,
  HardDrive, Activity,
} from 'lucide-react';

interface Account {
  id: string;
  username: string;
  domain: string;
  diskUsed: number;
  bandwidthUsed: number;
  package?: { diskSpace: number; bandwidth: number; name: string };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/files', label: 'File Manager', icon: FolderOpen },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/databases', label: 'Databases', icon: Database },
  { href: '/subdomains', label: 'Subdomains', icon: Globe },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const accountData = localStorage.getItem('account');
    if (!token || !accountData) { router.push('/login'); return; }
    setAccount(JSON.parse(accountData));
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
    localStorage.removeItem('account');
    router.push('/login');
  };

  const diskPercent = account?.package?.diskSpace
    ? Math.round((account.diskUsed / account.package.diskSpace) * 100) : 0;
  const bwPercent = account?.package?.bandwidth
    ? Math.round((account.bandwidthUsed / account.package.bandwidth) * 100) : 0;

  const formatMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-emerald-900 dark:bg-emerald-950 text-white transition-all duration-200 flex flex-col`}>
        <div className="flex items-center h-16 px-4 border-b border-emerald-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="ml-3 font-bold text-lg">SitePanel</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && account?.package && (
            <div className="mt-6 pt-4 border-t border-emerald-800 px-3 space-y-3">
              <p className="text-xs font-medium text-emerald-300 uppercase tracking-wider">Usage</p>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-200">
                    <HardDrive className="w-3 h-3 inline mr-1" />
                    Disk
                  </span>
                  <span className="text-emerald-300">{formatMB(account.diskUsed)} / {formatMB(account.package.diskSpace)}</span>
                </div>
                <div className="w-full bg-emerald-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(diskPercent, 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-200">
                    <Activity className="w-3 h-3 inline mr-1" />
                    Bandwidth
                  </span>
                  <span className="text-emerald-300">{formatMB(account.bandwidthUsed)} / {formatMB(account.package.bandwidth)}</span>
                </div>
                <div className="w-full bg-emerald-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(bwPercent, 100)}%` }} />
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-emerald-800 p-2 space-y-1">
          <button onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-emerald-200 hover:bg-emerald-800 hover:text-white transition"
          >
            {dark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {!collapsed && <span className="text-sm">{dark ? 'Light' : 'Dark'}</span>}
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {account?.username?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{account?.username}</p>
                <p className="text-xs text-emerald-300 truncate">{account?.domain}</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-emerald-300 hover:text-white transition flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full px-3 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-800 hover:text-white transition"
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
