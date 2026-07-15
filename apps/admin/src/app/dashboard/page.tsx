'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Users,
  Package,
  HardDrive,
  Activity,
  LogOut,
  LayoutDashboard,
  Database,
  Globe,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Stats {
  accounts: number;
  packages: number;
  users: number;
  databases: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ accounts: 0, packages: 0, users: 0, databases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchStats(token);
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      const [accountsRes, packagesRes] = await Promise.all([
        fetch('/api/accounts', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/packages', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const accountsData = await accountsRes.json();
      const packagesData = await packagesRes.json();

      setStats({
        accounts: accountsData.pagination?.total || 0,
        packages: packagesData.length || 0,
        users: 0,
        databases: 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">ServerHQ</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Accounts"
            value={stats.accounts}
            color="blue"
          />
          <StatCard
            icon={<Package className="w-6 h-6" />}
            label="Hosting Packages"
            value={stats.packages}
            color="green"
          />
          <StatCard
            icon={<HardDrive className="w-6 h-6" />}
            label="Disk Usage"
            value="2.4 GB"
            color="purple"
          />
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            label="Server Status"
            value="Online"
            color="emerald"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
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
              icon={<Database className="w-5 h-5" />}
              label="Server Status"
              description="Monitor server health"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
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
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, description, onClick }: { icon: React.ReactNode; label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition text-left"
    >
      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

function ActivityItem({ icon, message, time }: { icon: React.ReactNode; message: string; time: string }) {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition">
      <div className="p-2 bg-gray-100 text-gray-600 rounded-full">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{message}</p>
      </div>
      <p className="text-xs text-gray-400">{time}</p>
    </div>
  );
}
