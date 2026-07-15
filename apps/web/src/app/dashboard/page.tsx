'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  HardDrive,
  Mail,
  Database,
  Activity,
  LogOut,
  FolderOpen,
  Subscript,
  Server,
} from 'lucide-react';

interface Account {
  id: string;
  username: string;
  domain: string;
  package?: {
    name: string;
    diskSpace: number;
    bandwidth: number;
    emailAccounts: number;
    databases: number;
  };
  diskUsed: number;
  bandwidthUsed: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const accountData = localStorage.getItem('account');

    if (!token || !accountData) {
      router.push('/login');
      return;
    }

    setAccount(JSON.parse(accountData));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('account');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diskPercentage = account?.package
    ? Math.round((account.diskUsed / account.package.diskSpace) * 100)
    : 0;

  const bandwidthPercentage = account?.package
    ? Math.round((account.bandwidthUsed / account.package.bandwidth) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900">SitePanel</span>
                <span className="ml-2 text-sm text-gray-500">{account?.domain}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <UsageCard
            icon={<HardDrive className="w-5 h-5" />}
            label="Disk Usage"
            used={account?.diskUsed || 0}
            total={account?.package?.diskSpace || 0}
            percentage={diskPercentage}
            color="blue"
          />
          <UsageCard
            icon={<Activity className="w-5 h-5" />}
            label="Bandwidth"
            used={account?.bandwidthUsed || 0}
            total={account?.package?.bandwidth || 0}
            percentage={bandwidthPercentage}
            color="emerald"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction
              icon={<FolderOpen className="w-5 h-5" />}
              label="File Manager"
              onClick={() => router.push('/files')}
            />
            <QuickAction
              icon={<Mail className="w-5 h-5" />}
              label="Email"
              onClick={() => router.push('/email')}
            />
            <QuickAction
              icon={<Database className="w-5 h-5" />}
              label="Databases"
              onClick={() => router.push('/databases')}
            />
            <QuickAction
              icon={<Subscript className="w-5 h-5" />}
              label="Subdomains"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem label="Username" value={account?.username || '-'} />
            <InfoItem label="Domain" value={account?.domain || '-'} />
            <InfoItem label="Package" value={account?.package?.name || '-'} />
            <InfoItem label="Status" value="Active" badge="green" />
          </div>
        </div>
      </main>
    </div>
  );
}

function UsageCard({ icon, label, used, total, percentage, color }: {
  icon: React.ReactNode;
  label: string;
  used: number;
  total: number;
  percentage: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
  };

  const formatMB = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
            {icon}
          </div>
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {formatMB(used)} / {formatMB(total)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{percentage}% used</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition"
    >
      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

function InfoItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-gray-900 font-medium">{value}</p>
        {badge === 'green' && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            Active
          </span>
        )}
      </div>
    </div>
  );
}
