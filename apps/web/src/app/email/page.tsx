'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Plus,
  Trash2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check,
  Forward,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';

interface EmailAccount {
  id: string;
  email: string;
  quota: number;
  usedSpace: number;
  isActive: boolean;
  createdAt: string;
  forwarders: EmailForwarder[];
  filters: EmailFilter[];
  _count: { forwarders: number; filters: number };
}

interface EmailForwarder {
  id: string;
  source: string;
  destination: string;
  isActive: boolean;
}

interface EmailFilter {
  id: string;
  name: string;
  rule: string;
  pattern: string;
  action: string;
  isActive: boolean;
}

export default function EmailPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailAccount | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    quota: 1024,
    forwardSource: '',
    forwardDest: '',
    filterName: '',
    filterRule: 'contains',
    filterPattern: '',
    filterAction: 'discard',
    filterDest: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchEmails(token);
  }, [router]);

  const fetchEmails = async (token?: string) => {
    const t = token || localStorage.getItem('token');
    if (!t) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/email', {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      setEmails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pwd = '';
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
    setForm({ ...form, password: pwd });
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          quota: form.quota,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create email account');
      }

      setShowCreate(false);
      setForm({ ...form, email: '', password: '', quota: 1024 });
      setGeneratedPassword('');
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('Delete this email account? This will also remove all forwarders and filters.')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/email/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete email account');

      if (selectedEmail?.id === id) setSelectedEmail(null);
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateForwarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/email/${selectedEmail.id}/forwarders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: form.forwardSource,
          destination: form.forwardDest,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create forwarder');
      }

      setForm({ ...form, forwardSource: '', forwardDest: '' });
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteForwarder = async (emailId: string, forwarderId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`/api/email/${emailId}/forwarders/${forwarderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/email/${selectedEmail.id}/filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.filterName,
          rule: form.filterRule,
          pattern: form.filterPattern,
          action: form.filterAction,
          destination: form.filterDest || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create filter');
      }

      setForm({ ...form, filterName: '', filterPattern: '', filterDest: '' });
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFilter = async (emailId: string, filterId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`/api/email/${emailId}/filters/${filterId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmails(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatMB = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const currentEmail = selectedEmail ? emails.find(e => e.id === selectedEmail.id) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Email Manager</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchEmails()}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Email
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Email Account</h3>
              <form onSubmit={handleCreateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="user@domain.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      type={passwordVisible['new'] ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible({ ...passwordVisible, 'new': !passwordVisible['new'] })}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {passwordVisible['new'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quota (MB) <span className="text-gray-400 font-normal">- max 102400</span>
                  </label>
                  <input
                    type="number"
                    value={form.quota}
                    onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 1024 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    min={1}
                    max={102400}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setGeneratedPassword(''); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentEmail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{currentEmail.email}</h3>
                    <p className="text-sm text-gray-500">
                      {formatMB(currentEmail.usedSpace)} / {formatMB(currentEmail.quota)} used
                      &middot; {currentEmail._count.forwarders} forwarders
                      &middot; {currentEmail._count.filters} filters
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(Math.round((currentEmail.usedSpace / currentEmail.quota) * 100), 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Forwarders */}
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                    <Forward className="w-4 h-4" /> Forwarders
                  </h4>

                  <form onSubmit={handleCreateForwarder} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={form.forwardSource}
                      onChange={(e) => setForm({ ...form, forwardSource: e.target.value })}
                      placeholder="forward@domain.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <span className="flex items-center text-gray-400 text-sm">→</span>
                    <input
                      type="email"
                      value={form.forwardDest}
                      onChange={(e) => setForm({ ...form, forwardDest: e.target.value })}
                      placeholder="dest@email.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Add
                    </button>
                  </form>

                  {currentEmail.forwarders.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No forwarders configured</p>
                  ) : (
                    <div className="space-y-2">
                      {currentEmail.forwarders.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-900">{f.source}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-600">{f.destination}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteForwarder(currentEmail.id, f.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4" /> Filters
                  </h4>

                  <form onSubmit={handleCreateFilter} className="space-y-2 mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.filterName}
                        onChange={(e) => setForm({ ...form, filterName: e.target.value })}
                        placeholder="Filter name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      />
                      <select
                        value={form.filterRule}
                        onChange={(e) => setForm({ ...form, filterRule: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals</option>
                        <option value="regex">Regex</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.filterPattern}
                        onChange={(e) => setForm({ ...form, filterPattern: e.target.value })}
                        placeholder="Pattern"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      />
                      <select
                        value={form.filterAction}
                        onChange={(e) => setForm({ ...form, filterAction: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="discard">Discard</option>
                        <option value="forward">Forward</option>
                        <option value="pipe">Pipe</option>
                      </select>
                      {form.filterAction === 'forward' && (
                        <input
                          type="email"
                          value={form.filterDest}
                          onChange={(e) => setForm({ ...form, filterDest: e.target.value })}
                          placeholder="Destination"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      )}
                      <button
                        type="submit"
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  {currentEmail.filters.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No filters configured</p>
                  ) : (
                    <div className="space-y-2">
                      {currentEmail.filters.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="text-sm">
                            <span className="text-gray-900 font-medium">{f.name}</span>
                            <span className="text-gray-400 mx-2">&middot;</span>
                            <span className="text-gray-600">{f.rule}: "{f.pattern}"</span>
                            <span className="text-gray-400 mx-2">&rarr;</span>
                            <span className="text-gray-600">{f.action}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteFilter(currentEmail.id, f.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Loading email accounts...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts</h3>
            <p className="text-gray-500 mb-6">Create your first email account to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Email Account
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Usage</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Forwarders</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Filters</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="text-gray-900 font-medium">{email.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(Math.round((email.usedSpace / email.quota) * 100), 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatMB(email.usedSpace)} / {formatMB(email.quota)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{email._count.forwarders}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{email._count.filters}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${email.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {email.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteEmail(email.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
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
