'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Plus,
  Trash2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';

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
    const token = localStorage.getItem('token');
    const account = localStorage.getItem('account');
    if (!token) { router.push('/login'); return; }
    if (account) {
      try { setAccountDomain(JSON.parse(account).domain); } catch {}
    }
    fetchSubdomains(token);
  }, [router]);

  const fetchSubdomains = async (token?: string) => {
    const t = token || localStorage.getItem('token');
    if (!t) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/domains', {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!response.ok) {
        if (response.status === 401) { router.push('/login'); return; }
        throw new Error('Failed to fetch subdomains');
      }

      setSubdomains(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subdomain: form.subdomain,
          documentRoot: form.documentRoot || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create subdomain');
      }

      setShowCreate(false);
      setForm({ subdomain: '', documentRoot: '' });
      fetchSubdomains(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subdomain?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/domains/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete subdomain');
      fetchSubdomains(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Subdomains</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => fetchSubdomains()} className="p-2 text-gray-400 hover:text-gray-600" title="Refresh">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Subdomain
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Subdomain</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.subdomain}
                      onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="blog"
                      required
                    />
                    <span className="text-sm text-gray-500">.{accountDomain}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Root <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.documentRoot}
                    onChange={(e) => setForm({ ...form, documentRoot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder={`/home/.../public_html/${form.subdomain || 'blog'}`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Loading subdomains...</p>
          </div>
        ) : subdomains.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Subdomains</h3>
            <p className="text-gray-500 mb-6">Add your first subdomain to get started.</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Subdomain
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Subdomain</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Full URL</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Document Root</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subdomains.map((sd) => (
                  <tr key={sd.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className="text-gray-900 font-medium">{sd.subdomain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {sd.subdomain}.{accountDomain}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {sd.documentRoot}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(sd.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(sd.id)} className="p-1 text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
