'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Server, HardDrive, Wifi, Clock,
  CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';

interface Service {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  version?: string;
  containerName: string;
}

interface ResourceStats {
  cpu: { percent: number; loadAvg: string };
  memory: { used: string; total: string; percent: number };
  disk: { used: string; total: string; percent: number };
  network: { rx: string; tx: string };
}

interface ServerStatusData {
  services: Service[];
  stats: ResourceStats;
  lastCheck: string;
}

export default function ServerStatusPage() {
  const router = useRouter();
  const [data, setData] = useState<ServerStatusData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const res = await fetch('/api/server-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch server status');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchStatus();
  }, [router, fetchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus().finally(() => setRefreshing(false));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-surface-600 dark:text-surface-400">{error}</p>
          <button onClick={handleRefresh} className="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-xl">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-surface-400" />
      </div>
    );
  }

  const onlineCount = data.services.filter(s => s.status === 'online').length;
  const totalServices = data.services.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Server Status</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Last checked: {new Date(data.lastCheck).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-xl transition font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          label="Services"
          value={`${onlineCount}/${totalServices}`}
          subtitle="online"
          color="green"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Load Average"
          value={data.stats.cpu.loadAvg.split(' / ')[0]}
          subtitle={data.stats.cpu.loadAvg}
          color="blue"
        />
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Disk Usage"
          value={`${data.stats.disk.percent}%`}
          subtitle={`${data.stats.disk.used} / ${data.stats.disk.total}`}
          color="purple"
        />
        <StatCard
          icon={<Wifi className="w-6 h-6" />}
          label="Network"
          value={`${data.stats.network.rx}`}
          subtitle={`in / ${data.stats.network.tx} out`}
          color="emerald"
        />
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">System Services</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Service</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Version</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Uptime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
            {data.services.map((svc) => (
              <tr key={svc.name} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition">
                <td className="px-6 py-4">
                  <span className="font-medium text-surface-900 dark:text-white">{svc.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    svc.status === 'online'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : svc.status === 'degraded'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {svc.status === 'online' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {svc.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-surface-500 dark:text-surface-400">{svc.version || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-surface-400" />
                    <span className="text-sm text-surface-600 dark:text-surface-300">{svc.uptime}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Resource Usage</h2>
        <div className="space-y-4">
          <ResourceBar
            label="CPU Usage"
            percentage={data.stats.cpu.percent}
            color="blue"
            detail={`${data.stats.cpu.percent.toFixed(1)}% (${data.stats.cpu.loadAvg})`}
          />
          <ResourceBar
            label="Memory"
            percentage={data.stats.memory.percent}
            color="green"
            detail={`${data.stats.memory.used} / ${data.stats.memory.total}`}
          />
          <ResourceBar
            label="Disk Usage"
            percentage={data.stats.disk.percent}
            color="purple"
            detail={`${data.stats.disk.used} / ${data.stats.disk.total}`}
          />
          <ResourceBar
            label="Network"
            percentage={Math.min(
              Math.round(
                (parseFloat(data.stats.network.rx) / (parseFloat(data.stats.network.rx) + parseFloat(data.stats.network.tx) || 1)) * 100
              ),
              100
            )}
            color="emerald"
            detail={`${data.stats.network.rx} in / ${data.stats.network.tx} out`}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }: { icon: React.ReactNode; label: string; value: string; subtitle: string; color: string }) {
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

function ResourceBar({ label, percentage, color, detail }: { label: string; percentage: number; color: string; detail: string }) {
  const barColors: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-emerald-500', purple: 'bg-purple-500', emerald: 'bg-teal-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</span>
        <span className="text-sm text-surface-500 dark:text-surface-400">{detail}</span>
      </div>
      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${barColors[color]} transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}
