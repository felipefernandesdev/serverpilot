'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, SlidersHorizontal, X, AlertCircle,
  CheckCircle, PauseCircle, PlayCircle, Trash2, Eye,
  HardDrive, Activity, Mail, Database, Globe,
  AlertTriangle, Clock, Server,
} from 'lucide-react';

interface Account {
  id: string;
  username: string;
  domain: string;
  isActive: boolean;
  suspendedAt: string | null;
  suspendReason: string | null;
  diskUsed: number;
  bandwidthUsed: number;
  createdAt: string;
  package?: { id: string; name: string; diskSpace: number };
  user?: { id: string; email: string; name: string };
}

interface AccountDetail {
  id: string;
  username: string;
  domain: string;
  isActive: boolean;
  suspendedAt: string | null;
  suspendReason: string | null;
  diskUsed: number;
  bandwidthUsed: number;
  createdAt: string;
  package: PackageDetail | null;
  emailAccounts: EmailAccount[];
  databases: Database[];
  subdomains: Subdomain[];
  ftpAccounts: FtpAccount[];
  cronJobs: CronJob[];
  backups: Backup[];
}

interface EmailAccount { id: string; email: string; quota: number; usedSpace: number; isActive: boolean; createdAt: string; }
interface Database { id: string; name: string; type: string; createdAt: string; }
interface Subdomain { id: string; subdomain: string; documentRoot: string; createdAt: string; }
interface FtpAccount { id: string; username: string; directory: string; isActive: boolean; }
interface CronJob { id: string; command: string; schedule: string; isActive: boolean; }
interface Backup { id: string; filename: string; size: number; createdAt: string; }
interface PackageDetail { id: string; name: string; diskSpace: number; bandwidth: number; emailAccounts: number; databases: number; subdomains: number; ftpAccounts: number; }

interface DnsRecord { name: string; type: string; ttl: number; records: { content: string; disabled: boolean }[]; }

interface Package {
  id: string;
  name: string;
  diskSpace: number;
  bandwidth: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [token, setToken] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Account | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteDetail, setDeleteDetail] = useState<AccountDetail | null>(null);
  const [loadingDeleteInfo, setLoadingDeleteInfo] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [financialConfirmed, setFinancialConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getToken = useCallback(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return ''; }
    return t;
  }, [router]);

  const fetchData = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    setToken(t);
    setLoading(true);
    setError('');
    try {
      const [accRes, pkgRes] = await Promise.all([
        fetch('/api/accounts', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/packages', { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (!accRes.ok || !pkgRes.ok) throw new Error('Failed to fetch data');
      const accData = await accRes.json();
      const pkgData = await pkgRes.json();
      setAccounts(accData.accounts || []);
      setPackages(pkgData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchDetail = useCallback(async (id: string) => {
    const t = getToken();
    if (!t) return;
    setLoadingDetail(true);
    try {
      const [detailRes, dnsRes] = await Promise.all([
        fetch(`/api/accounts/${id}`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`/api/accounts/${id}/dns`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (detailRes.ok) setAccountDetail(await detailRes.json());
      if (dnsRes.ok) { const d = await dnsRes.json(); setDnsRecords(d.records || []); }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false); }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password'),
          domain: form.get('domain'),
          packageId: form.get('packageId'),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create account');
      }
      setShowCreate(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to suspend');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnsuspend = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/unsuspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to unsuspend');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = async (account: Account) => {
    setError('');
    setDeleteTarget(account);
    setDeleteConfirmUsername('');
    setFinancialConfirmed(false);
    setDeleteDetail(null);
    setLoadingDeleteInfo(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load account details');
      setDeleteDetail(await res.json());
    } catch (err: any) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setLoadingDeleteInfo(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/accounts/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteTarget(null);
      setShowDetail(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = accounts.filter((a) =>
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    a.domain.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Accounts</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{accounts.length} total accounts</p>
        </div>
        <button
          onClick={() => { setError(''); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition dark:text-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Users className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-1">No accounts found</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            {search ? 'Try a different search term' : 'Create your first hosting account'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Account
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Account</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Package</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Disk</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {filtered.map((acc) => (
                <tr key={acc.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                        acc.isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                      }`}>
                        {acc.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">{acc.username}</p>
                        <p className="text-sm text-surface-500 dark:text-surface-400">{acc.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-surface-900 dark:text-white">
                      {acc.package?.name || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-600 dark:text-surface-300">
                        {acc.diskUsed} MB
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      acc.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {acc.isActive ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {acc.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-surface-500 dark:text-surface-400">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setShowDetail(acc); setDetailTab('overview'); fetchDetail(acc.id); }}
                        className="p-2 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {acc.isActive ? (
                        <button
                          onClick={() => {
                            const reason = prompt('Suspend reason:');
                            if (reason) handleSuspend(acc.id, reason);
                          }}
                          className="p-2 text-surface-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                          title="Suspend"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnsuspend(acc.id)}
                          className="p-2 text-surface-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                          title="Unsuspend"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(acc)}
                        className="p-2 text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Create Account</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Username</label>
                <input name="username" required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition dark:text-white" placeholder="client03" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Password</label>
                <input name="password" type="password" required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Domain</label>
                <input name="domain" required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition dark:text-white" placeholder="client03.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Package</label>
                <select name="packageId" required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition dark:text-white">
                  <option value="">Select a package...</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-xl transition font-medium">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                  showDetail.isActive
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                }`}>
                  {showDetail.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">{showDetail.username}</h2>
                  <p className="text-sm text-surface-500 dark:text-surface-400">{showDetail.domain}</p>
                </div>
              </div>
              <button onClick={() => { setShowDetail(null); setAccountDetail(null); }} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-surface-200 dark:border-surface-700 px-6 gap-1">
              {['overview', 'email', 'databases', 'subdomains', 'dns'].map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-[1px] ${
                    detailTab === tab
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  }`}>
                  {tab === 'overview' && 'Overview'}
                  {tab === 'email' && `Email (${accountDetail?.emailAccounts?.length || 0})`}
                  {tab === 'databases' && `Databases (${accountDetail?.databases?.length || 0})`}
                  {tab === 'subdomains' && `Subdomains (${accountDetail?.subdomains?.length || 0})`}
                  {tab === 'dns' && `DNS (${dnsRecords.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detailTab === 'overview' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-sm mb-1">
                        <HardDrive className="w-4 h-4" /> Disk Usage
                      </div>
                      <p className="text-xl font-bold text-surface-900 dark:text-white">{showDetail.diskUsed} MB</p>
                      {accountDetail?.package && (
                        <p className="text-xs text-surface-400 mt-1">of {accountDetail.package.diskSpace} MB limit</p>
                      )}
                    </div>
                    <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-sm mb-1">
                        <Activity className="w-4 h-4" /> Bandwidth
                      </div>
                      <p className="text-xl font-bold text-surface-900 dark:text-white">{showDetail.bandwidthUsed} MB</p>
                      {accountDetail?.package && (
                        <p className="text-xs text-surface-400 mt-1">of {accountDetail.package.bandwidth} MB limit</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl text-center">
                      <Mail className="w-4 h-4 mx-auto text-surface-400 mb-1" />
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{accountDetail?.emailAccounts?.length || 0}</p>
                      <p className="text-xs text-surface-500">Email</p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl text-center">
                      <Database className="w-4 h-4 mx-auto text-surface-400 mb-1" />
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{accountDetail?.databases?.length || 0}</p>
                      <p className="text-xs text-surface-500">Databases</p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl text-center">
                      <Globe className="w-4 h-4 mx-auto text-surface-400 mb-1" />
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{accountDetail?.subdomains?.length || 0}</p>
                      <p className="text-xs text-surface-500">Subdomains</p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl text-center">
                      <Users className="w-4 h-4 mx-auto text-surface-400 mb-1" />
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{accountDetail?.ftpAccounts?.length || 0}</p>
                      <p className="text-xs text-surface-500">FTP</p>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl space-y-2">
                    <DetailRow label="Package" value={showDetail.package?.name || '-'} />
                    <DetailRow label="Reseller" value={showDetail.user?.name || '-'} />
                    <DetailRow label="Status" value={showDetail.isActive ? 'Active' : 'Suspended'} />
                    {showDetail.suspendReason && <DetailRow label="Suspend Reason" value={showDetail.suspendReason} />}
                    <DetailRow label="Created" value={new Date(showDetail.createdAt).toLocaleDateString()} />
                  </div>

                  <div className="flex gap-3 pt-2">
                    {showDetail.isActive ? (
                      <button onClick={() => { const r = prompt('Reason:'); if (r) { handleSuspend(showDetail.id, r); setShowDetail(null); } }} className="flex-1 px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition font-medium">
                        Suspend
                      </button>
                    ) : (
                      <button onClick={() => { handleUnsuspend(showDetail.id); setShowDetail(null); }} className="flex-1 px-4 py-2.5 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition font-medium">
                        Unsuspend
                      </button>
                    )}
                    <button onClick={() => { confirmDelete(showDetail); }} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              ) : detailTab === 'email' ? (
                <div className="space-y-3">
                  {(accountDetail?.emailAccounts?.length || 0) === 0 ? (
                    <p className="text-sm text-surface-400 italic text-center py-8">No email accounts</p>
                  ) : (
                    accountDetail!.emailAccounts.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{e.email}</p>
                          <p className="text-xs text-surface-500">{e.usedSpace} MB / {e.quota} MB used</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${e.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                          {e.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : detailTab === 'databases' ? (
                <div className="space-y-3">
                  {(accountDetail?.databases?.length || 0) === 0 ? (
                    <p className="text-sm text-surface-400 italic text-center py-8">No databases</p>
                  ) : (
                    accountDetail!.databases.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{d.name}</p>
                          <p className="text-xs text-surface-500">{d.type}</p>
                        </div>
                        <span className="text-xs text-surface-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : detailTab === 'subdomains' ? (
                <div className="space-y-3">
                  {(accountDetail?.subdomains?.length || 0) === 0 ? (
                    <p className="text-sm text-surface-400 italic text-center py-8">No subdomains</p>
                  ) : (
                    accountDetail!.subdomains.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{s.subdomain}.{showDetail.domain}</p>
                          <p className="text-xs text-surface-500">{s.documentRoot}</p>
                        </div>
                        <span className="text-xs text-surface-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : detailTab === 'dns' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Zone: {showDetail.domain}</p>
                  {dnsRecords.length === 0 ? (
                    <p className="text-sm text-surface-400 italic text-center py-8">No DNS records</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                          <th className="text-left py-2 text-surface-500 font-medium">Name</th>
                          <th className="text-left py-2 text-surface-500 font-medium">Type</th>
                          <th className="text-left py-2 text-surface-500 font-medium">Value</th>
                          <th className="text-right py-2 text-surface-500 font-medium">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                        {dnsRecords.map((r, i) => (
                          <tr key={i}>
                            <td className="py-2 text-surface-900 dark:text-white">{r.name}</td>
                            <td className="py-2"><span className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded">{r.type}</span></td>
                            <td className="py-2 text-surface-500">{r.records.map(rec => rec.content).join(', ')}</td>
                            <td className="py-2 text-right text-surface-400">{r.ttl}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Delete Account</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">This action cannot be undone</p>
              </div>
            </div>

            {loadingDeleteInfo ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : deleteDetail ? (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="font-semibold text-surface-900 dark:text-white">{deleteDetail.username}</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400">{deleteDetail.domain}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">Resources to be deleted:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <Mail className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.emailAccounts?.length || 0} email accounts
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <Database className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.databases?.length || 0} databases
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <Globe className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.subdomains?.length || 0} subdomains
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <Server className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.ftpAccounts?.length || 0} FTP accounts
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <Clock className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.cronJobs?.length || 0} cron jobs
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-50 dark:bg-surface-900/50 rounded-lg flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {deleteDetail.backups?.length || 0} backups
                      </span>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={financialConfirmed}
                    onChange={(e) => setFinancialConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    I confirm this client has <strong>no pending financial obligations</strong> and I authorize the permanent deletion of all data above.
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Type <strong className="text-red-600">{deleteDetail.username}</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmUsername}
                    onChange={(e) => setDeleteConfirmUsername(e.target.value)}
                    placeholder={`Type "${deleteDetail.username}" to confirm`}
                    className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeDelete}
                    disabled={deleteConfirmUsername !== deleteDetail.username || !financialConfirmed || deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition font-medium flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Permanently Delete'
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-surface-500 dark:text-surface-400">{label}</span>
      <span className="text-sm font-medium text-surface-900 dark:text-white">{value}</span>
    </div>
  );
}
