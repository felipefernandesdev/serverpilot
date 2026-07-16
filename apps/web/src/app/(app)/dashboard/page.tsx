'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, HardDrive, Mail, Database, Activity,
  ExternalLink, FolderOpen,
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
  const [showViewSite, setShowViewSite] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const accountData = localStorage.getItem('account');
    if (accountData) setAccount(JSON.parse(accountData));
    setLoading(false);
  }, []);

  const handleOpenPreview = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/site/preview/token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get preview token');
      const data = await res.json();
      window.open(`/api/site/preview?token=${data.token}`, '_blank');
    } catch {
      alert('Could not open site preview. Please try again.');
    } finally {
      setPreviewLoading(false);
      setShowViewSite(false);
    }
  };

  const handleOpenDomain = () => {
    if (account?.domain) {
      window.open(`http://${account.domain}`, '_blank');
    }
    setShowViewSite(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diskPercentage = account?.package
    ? Math.round((account.diskUsed / account.package.diskSpace) * 100) : 0;
  const bandwidthPercentage = account?.package
    ? Math.round((account.bandwidthUsed / account.package.bandwidth) * 100) : 0;

  return (
    <div className="space-y-8">
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

        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction icon={<FolderOpen className="w-5 h-5" />} label="File Manager" onClick={() => router.push('/files')} />
            <QuickAction icon={<Mail className="w-5 h-5" />} label="Email" onClick={() => router.push('/email')} />
            <QuickAction icon={<Database className="w-5 h-5" />} label="Databases" onClick={() => router.push('/databases')} />
            <QuickAction icon={<Globe className="w-5 h-5" />} label="Subdomains" onClick={() => router.push('/subdomains')} />
            <QuickAction icon={<ExternalLink className="w-5 h-5" />} label="View Site" onClick={() => setShowViewSite(true)} />
          </div>
        </div>

        {showViewSite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowViewSite(false)}>
            <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">View Your Site</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">Choose how to view your website.</p>
              <div className="space-y-3">
                <button onClick={handleOpenPreview} disabled={previewLoading}
                  className="w-full flex items-center gap-4 p-4 border border-surface-200 dark:border-surface-700 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition group disabled:opacity-50">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-surface-900 dark:text-white">{previewLoading ? 'Loading...' : 'Local Preview'}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">View via local preview (requires auth)</p>
                  </div>
                </button>
                <button onClick={handleOpenDomain}
                  className="w-full flex items-center gap-4 p-4 border border-surface-200 dark:border-surface-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-surface-900 dark:text-white">Open Domain</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Open {account?.domain} directly</p>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowViewSite(false)}
                className="w-full mt-4 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem label="Username" value={account?.username || '-'} />
            <InfoItem label="Domain" value={account?.domain || '-'} />
            <InfoItem label="Package" value={account?.package?.name || '-'} />
            <InfoItem label="Status" value="Active" badge="green" />
          </div>
        </div>
    </div>
  );
}

function UsageCard({ icon, label, used, total, percentage, color }: {
  icon: React.ReactNode; label: string; used: number; total: number; percentage: number; color: string;
}) {
  const barColor = color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';
  const formatMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface-100 dark:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-400">
            {icon}
          </div>
          <span className="font-medium text-surface-900 dark:text-white">{label}</span>
        </div>
        <span className="text-sm text-surface-500 dark:text-surface-400">
          {formatMB(used)} / {formatMB(total)}
        </span>
      </div>
      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">{percentage}% used</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-4 border border-surface-200 dark:border-surface-700 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition group">
      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition">
        {icon}
      </div>
      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</span>
    </button>
  );
}

function InfoItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-surface-900 dark:text-white font-medium">{value}</p>
        {badge === 'green' && (
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Active</span>
        )}
      </div>
    </div>
  );
}
