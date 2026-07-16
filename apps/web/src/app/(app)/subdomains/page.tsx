'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Plus, Trash2, RefreshCw, AlertCircle, FolderOpen } from 'lucide-react';

interface Subdomain {
  id: string;
  subdomain: string;
  documentRoot: string;
  createdAt: string;
}

export default function SubdomainsPage() {
  const router = useRouter();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [accountDomain, setAccountDomain] = useState('');
  const [form, setForm] = useState({ subdomain: '', documentRoot: '' });

  useEffect(() => {
    const account = localStorage.getItem('account');
    if (account) {
      try { setAccountDomain(JSON.parse(account).domain); } catch {}
    }
    fetchSubdomains();
  }, []);

  const fetchSubdomains = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/domains', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to fetch subdomains');
      setSubdomains(await res.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subdomain: form.subdomain, documentRoot: form.documentRoot || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setShowCreate(false); setForm({ subdomain: '', documentRoot: '' }); fetchSubdomains();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subdomain?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      fetchSubdomains();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Subdomains</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{subdomains.length} subdomains</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchSubdomains()} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> Add Subdomain
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Add Subdomain</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                    className="flex-1 px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition dark:text-white" placeholder="blog" required />
                  <span className="text-sm text-surface-500 dark:text-surface-400">.{accountDomain}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Document Root <span className="text-surface-400 font-normal">(optional)</span></label>
                <input type="text" value={form.documentRoot} onChange={(e) => setForm({ ...form, documentRoot: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition dark:text-white" placeholder={`public_html/${form.subdomain || 'blog'}`} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subdomains.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Globe className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No Subdomains</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Add your first subdomain to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition inline-flex items-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Add Subdomain
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Subdomain</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Full URL</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Document Root</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {subdomains.map((sd) => (
                <tr key={sd.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-surface-900 dark:text-white">{sd.subdomain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400 font-mono">
                    {sd.subdomain}.{accountDomain}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {sd.documentRoot}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">
                    {new Date(sd.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(sd.id)} className="p-1 text-surface-400 hover:text-red-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
