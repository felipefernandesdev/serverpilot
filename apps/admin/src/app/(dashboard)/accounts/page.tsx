'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, SlidersHorizontal, X, AlertCircle,
  CheckCircle, PauseCircle, PlayCircle, Trash2, Eye,
  HardDrive, Activity, Mail, Database, Globe,
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
  const [creating, setCreating] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setShowDetail(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
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
                        onClick={() => setShowDetail(acc)}
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
                        onClick={() => handleDelete(acc.id)}
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
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
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
              <button onClick={() => setShowDetail(null)} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                  <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-sm mb-1">
                    <HardDrive className="w-4 h-4" />
                    Disk Usage
                  </div>
                  <p className="text-lg font-bold text-surface-900 dark:text-white">{showDetail.diskUsed} MB</p>
                </div>
                <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                  <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-sm mb-1">
                    <Activity className="w-4 h-4" />
                    Bandwidth
                  </div>
                  <p className="text-lg font-bold text-surface-900 dark:text-white">{showDetail.bandwidthUsed} MB</p>
                </div>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl space-y-3">
                <DetailRow label="Package" value={showDetail.package?.name || '-'} />
                <DetailRow label="Reseller" value={showDetail.user?.name || '-'} />
                <DetailRow label="Status" value={showDetail.isActive ? 'Active' : 'Suspended'} />
                {showDetail.suspendReason && <DetailRow label="Suspend Reason" value={showDetail.suspendReason} />}
                <DetailRow label="Created" value={new Date(showDetail.createdAt).toLocaleDateString()} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {showDetail.isActive ? (
                <button onClick={() => { const r = prompt('Reason:'); if (r) { handleSuspend(showDetail.id, r); setShowDetail(null); } }} className="flex-1 px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition font-medium">
                  Suspend
                </button>
              ) : (
                <button onClick={() => { handleUnsuspend(showDetail.id); setShowDetail(null); }} className="flex-1 px-4 py-2.5 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition font-medium">
                  Unsuspend
                </button>
              )}
              <button onClick={() => { handleDelete(showDetail.id); }} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-medium">
                Delete
              </button>
            </div>
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
