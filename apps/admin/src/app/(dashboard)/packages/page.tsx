'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Plus, X, AlertCircle, CheckCircle,
  Edit3, Trash2, HardDrive, Activity, Mail, Database,
  Globe, Server,
} from 'lucide-react';

interface HostingPackage {
  id: string;
  name: string;
  description: string | null;
  diskSpace: number;
  bandwidth: number;
  emailAccounts: number;
  databases: number;
  subdomains: number;
  ftpAccounts: number;
  SSL: boolean;
  sshAccess: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<HostingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HostingPackage | null>(null);
  const [saving, setSaving] = useState(false);

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
      const res = await fetch('/api/packages', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to fetch packages');
      setPackages(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get('name'),
      description: form.get('description'),
      diskSpace: Number(form.get('diskSpace')),
      bandwidth: Number(form.get('bandwidth')),
      emailAccounts: Number(form.get('emailAccounts')),
      databases: Number(form.get('databases')),
      subdomains: Number(form.get('subdomains')),
      ftpAccounts: Number(form.get('ftpAccounts')),
      ssl: form.get('ssl') === 'true',
      sshAccess: form.get('sshAccess') === 'true',
    };
    setSaving(true);
    setError('');
    try {
      const url = editing ? `/api/packages/${editing.id}` : '/api/packages';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save package');
      }
      setShowModal(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this package? Accounts using it must be reassigned first.')) return;
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Cannot delete package');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

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
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Hosting Packages</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{packages.length} packages available</p>
        </div>
        <button
          onClick={() => { setError(''); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition font-medium"
        >
          <Plus className="w-4 h-4" />
          New Package
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {packages.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Package className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-1">No packages yet</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Create your first hosting package</p>
          <button
            onClick={() => { setError(''); setEditing(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition font-medium"
          >
            <Plus className="w-4 h-4" />
            New Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 animate-fade-in hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{pkg.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setError(''); setEditing(pkg); setShowModal(true); }}
                    className="p-2 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <HardDrive className="w-3.5 h-3.5" /> Disk
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.diskSpace} MB</p>
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <Activity className="w-3.5 h-3.5" /> Bandwidth
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.bandwidth} MB</p>
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.emailAccounts}</p>
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <Database className="w-3.5 h-3.5" /> Databases
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.databases}</p>
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <Globe className="w-3.5 h-3.5" /> Subdomains
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.subdomains}</p>
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-xs mb-0.5">
                    <Server className="w-3.5 h-3.5" /> FTP
                  </div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{pkg.ftpAccounts}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  pkg.SSL ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                }`}>
                  {pkg.SSL ? 'SSL' : 'No SSL'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  pkg.sshAccess ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                }`}>
                  {pkg.sshAccess ? 'SSH' : 'No SSH'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  pkg.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  <CheckCircle className="w-3 h-3" />
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                {editing ? 'Edit Package' : 'New Package'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name</label>
                  <input name="name" defaultValue={editing?.name || ''} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
                  <input name="description" defaultValue={editing?.description || ''} className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Disk Space (MB)</label>
                  <input name="diskSpace" type="number" defaultValue={editing?.diskSpace || 1024} min={100} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Bandwidth (MB)</label>
                  <input name="bandwidth" type="number" defaultValue={editing?.bandwidth || 10240} min={100} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email Accounts</label>
                  <input name="emailAccounts" type="number" defaultValue={editing?.emailAccounts || 10} min={0} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Databases</label>
                  <input name="databases" type="number" defaultValue={editing?.databases || 5} min={0} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Subdomains</label>
                  <input name="subdomains" type="number" defaultValue={editing?.subdomains || 10} min={0} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">FTP Accounts</label>
                  <input name="ftpAccounts" type="number" defaultValue={editing?.ftpAccounts || 5} min={0} required className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">SSL</label>
                  <select name="ssl" defaultValue={editing ? String(editing.SSL) : 'true'} className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">SSH Access</label>
                  <select name="sshAccess" defaultValue={String(editing?.sshAccess || false)} className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition dark:text-white">
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-xl transition font-medium">
                  {saving ? 'Saving...' : editing ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
