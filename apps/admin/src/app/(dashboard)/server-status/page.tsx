'use client';

import { useEffect, useState } from 'react';
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
}

const services: Service[] = [
  { name: 'Web Server (Nginx)', status: 'online', uptime: '15d 7h 23m', version: '1.25.3' },
  { name: 'Database (MySQL)', status: 'online', uptime: '15d 7h 22m', version: '8.0.35' },
  { name: 'FTP (Pure-FTPd)', status: 'online', uptime: '15d 7h 20m', version: '1.0.51' },
  { name: 'Email (Exim)', status: 'online', uptime: '15d 7h 19m', version: '4.97' },
  { name: 'DNS (Bind9)', status: 'online', uptime: '15d 7h 25m', version: '9.18.20' },
  { name: 'SSL (Certbot)', status: 'online', uptime: '15d 7h 18m', version: '2.8.0' },
  { name: 'Redis Cache', status: 'online', uptime: '15d 7h 24m', version: '7.2.4' },
  { name: 'SSH Server', status: 'online', uptime: '15d 7h 26m', version: 'OpenSSH 9.6' },
];

export default function ServerStatusPage() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, [router]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastCheck(new Date());
      setRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Server Status</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Last checked: {lastCheck.toLocaleTimeString()}
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
        <StatCard icon={<Server className="w-6 h-6" />} label="Services" value={`${services.filter(s => s.status === 'online').length}/${services.length}`} subtitle="online" color="green" />
        <StatCard icon={<Activity className="w-6 h-6" />} label="Load Average" value="0.42" subtitle="1 min average" color="blue" />
        <StatCard icon={<HardDrive className="w-6 h-6" />} label="Disk Usage" value="45%" subtitle="234 GB / 512 GB" color="purple" />
        <StatCard icon={<Wifi className="w-6 h-6" />} label="Network" value="1.2 Gbps" subtitle="in / 0.8 Gbps out" color="emerald" />
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
            {services.map((svc) => (
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
          <ResourceBar label="CPU Usage" percentage={23} color="blue" detail="0.42 / 0.53 / 0.38" />
          <ResourceBar label="Memory" percentage={62} color="green" detail="3.8 GB / 6.2 GB" />
          <ResourceBar label="Disk I/O" percentage={15} color="purple" detail="45 MB/s read / 12 MB/s write" />
          <ResourceBar label="Network" percentage={38} color="emerald" detail="1.2 Gbps in / 0.8 Gbps out" />
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
        <div className={`h-2.5 rounded-full ${barColors[color]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
