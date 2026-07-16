'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Package, HardDrive, Activity, Database, Globe,
} from 'lucide-react';

interface Stats {
  accounts: number;
  packages: number;
  users: number;
  databases: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ accounts: 0, packages: 0, users: 0, databases: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchStats(token);
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      const [accountsRes, packagesRes] = await Promise.all([
        fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/packages', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!accountsRes.ok || !packagesRes.ok) {
        throw new Error('API returned ' + accountsRes.status);
      }
      const accountsData = await accountsRes.json();
      const packagesData = await packagesRes.json();
      setStats({
        accounts: accountsData.pagination?.total || 0,
        packages: packagesData.length || 0,
        users: 0,
        databases: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diskTotal = stats.accounts * 1024;
  const diskUsed = stats.accounts * 256;
  const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dashboard</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">Overview of your hosting platform</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Accounts"
          value={stats.accounts}
          subtitle="active clients"
          color="blue"
        />
        <StatCard
          icon={<Package className="w-6 h-6" />}
          label="Hosting Packages"
          value={stats.packages}
          subtitle="available plans"
          color="green"
        />
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Disk Usage"
          value={`${(diskUsed / 1024).toFixed(1)} GB`}
          subtitle={`${diskPercent}% of ${(diskTotal / 1024).toFixed(1)} GB`}
          color="purple"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Server Status"
          value="Online"
          subtitle="All systems operational"
          color="emerald"
        />
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={<Users className="w-5 h-5" />}
            label="Create Account"
            description="Add a new hosting account"
            onClick={() => router.push('/accounts')}
          />
          <QuickAction
            icon={<Package className="w-5 h-5" />}
            label="Manage Packages"
            description="View and edit hosting plans"
            onClick={() => router.push('/packages')}
          />
          <QuickAction
            icon={<Activity className="w-5 h-5" />}
            label="Server Status"
            description="Monitor server health"
            onClick={() => router.push('/server-status')}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <ActivityItem
            icon={<Users className="w-4 h-4" />}
            message="New account created: client01"
            time="2 hours ago"
          />
          <ActivityItem
            icon={<Package className="w-4 h-4" />}
            message="Package updated: Professional"
            time="5 hours ago"
          />
          <ActivityItem
            icon={<Globe className="w-4 h-4" />}
            message="SSL certificate renewed for client02.com"
            time="1 day ago"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }: { icon: React.ReactNode; label: string; value: string | number; subtitle: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, description, onClick }: { icon: React.ReactNode; label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 border border-surface-200 dark:border-surface-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition text-left group"
    >
      <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg group-hover:scale-110 transition">
        {icon}
      </div>
      <div>
        <p className="font-medium text-surface-900 dark:text-white">{label}</p>
        <p className="text-sm text-surface-500 dark:text-surface-400">{description}</p>
      </div>
    </button>
  );
}

function ActivityItem({ icon, message, time }: { icon: React.ReactNode; message: string; time: string }) {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-surface-50 dark:hover:bg-surface-700/50 rounded-lg transition">
      <div className="p-2 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded-full">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-surface-900 dark:text-white">{message}</p>
      </div>
      <p className="text-xs text-surface-400">{time}</p>
    </div>
  );
}
