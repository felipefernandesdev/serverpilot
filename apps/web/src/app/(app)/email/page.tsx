'use client';

import { useEffect, useState } from 'react';
import {
  Mail, Plus, Trash2, RefreshCw, AlertCircle,
  Forward, Filter, Eye, EyeOff,
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
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailAccount | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', quota: 1024,
    forwardSource: '', forwardDest: '',
    filterName: '', filterRule: 'contains', filterPattern: '',
    filterAction: 'discard', filterDest: '',
  });

  useEffect(() => { fetchEmails(); }, []);

  const fetchEmails = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/email', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to fetch emails');
      setEmails(await res.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pwd = '';
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setGeneratedPassword(pwd);
    setForm({ ...form, password: pwd });
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, password: form.password, quota: form.quota }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setShowCreate(false);
      setForm({ ...form, email: '', password: '', quota: 1024 });
      setGeneratedPassword('');
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('Delete this email account? This will also remove all forwarders and filters.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/email/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (selectedEmail?.id === id) setSelectedEmail(null);
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateForwarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/email/${selectedEmail.id}/forwarders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: form.forwardSource, destination: form.forwardDest }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setForm({ ...form, forwardSource: '', forwardDest: '' });
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteForwarder = async (emailId: string, forwarderId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/email/${emailId}/forwarders/${forwarderId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/email/${selectedEmail.id}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.filterName, rule: form.filterRule, pattern: form.filterPattern,
          action: form.filterAction, destination: form.filterDest || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setForm({ ...form, filterName: '', filterPattern: '', filterDest: '' });
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteFilter = async (emailId: string, filterId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/email/${emailId}/filters/${filterId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchEmails();
    } catch (err: any) { setError(err.message); }
  };

  const formatMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  const currentEmail = selectedEmail ? emails.find(e => e.id === selectedEmail.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Email Manager</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{emails.length} email accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchEmails()} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> Create Email
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
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Create Email Account</h3>
            <form onSubmit={handleCreateEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email Address</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white" placeholder="user@domain.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Password</label>
                <div className="flex gap-2">
                  <input type={passwordVisible['new'] ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="flex-1 px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white" required minLength={6} />
                  <button type="button" onClick={() => setPasswordVisible({ ...passwordVisible, 'new': !passwordVisible['new'] })}
                    className="p-2.5 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-500">
                    {passwordVisible['new'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button type="button" onClick={generatePassword} className="px-3 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 text-sm text-surface-600 dark:text-surface-400">Generate</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Quota (MB) <span className="text-surface-400 font-normal">- max 102400</span></label>
                <input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 1024 })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white" min={1} max={102400} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setGeneratedPassword(''); }}
                  className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmail(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white">{currentEmail.email}</h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    {formatMB(currentEmail.usedSpace)} / {formatMB(currentEmail.quota)} used
                    &middot; {currentEmail._count.forwarders} forwarders
                    &middot; {currentEmail._count.filters} filters
                  </p>
                </div>
                <button onClick={() => setSelectedEmail(null)} className="text-surface-400 hover:text-surface-600 text-xl leading-none">&times;</button>
              </div>
              <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 mt-3">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(Math.round((currentEmail.usedSpace / currentEmail.quota) * 100), 100)}%` }} />
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-medium text-surface-900 dark:text-white flex items-center gap-2 mb-3">
                  <Forward className="w-4 h-4" /> Forwarders
                </h4>
                <form onSubmit={handleCreateForwarder} className="flex gap-2 mb-3">
                  <input type="text" value={form.forwardSource} onChange={(e) => setForm({ ...form, forwardSource: e.target.value })}
                    className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="forward@domain.com" required />
                  <span className="flex items-center text-surface-400 text-sm">→</span>
                  <input type="email" value={form.forwardDest} onChange={(e) => setForm({ ...form, forwardDest: e.target.value })}
                    className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="dest@email.com" required />
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm">Add</button>
                </form>
                {currentEmail.forwarders.length === 0 ? (
                  <p className="text-sm text-surface-400 italic">No forwarders configured</p>
                ) : (
                  <div className="space-y-2">
                    {currentEmail.forwarders.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-surface-900 dark:text-white">{f.source}</span>
                          <span className="text-surface-400">→</span>
                          <span className="text-surface-500 dark:text-surface-400">{f.destination}</span>
                        </div>
                        <button onClick={() => handleDeleteForwarder(currentEmail.id, f.id)} className="p-1 text-surface-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-surface-900 dark:text-white flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4" /> Filters
                </h4>
                <form onSubmit={handleCreateFilter} className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <input type="text" value={form.filterName} onChange={(e) => setForm({ ...form, filterName: e.target.value })}
                      className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="Filter name" required />
                    <select value={form.filterRule} onChange={(e) => setForm({ ...form, filterRule: e.target.value })}
                      className="px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white">
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="regex">Regex</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={form.filterPattern} onChange={(e) => setForm({ ...form, filterPattern: e.target.value })}
                      className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="Pattern" required />
                    <select value={form.filterAction} onChange={(e) => setForm({ ...form, filterAction: e.target.value })}
                      className="px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white">
                      <option value="discard">Discard</option>
                      <option value="forward">Forward</option>
                      <option value="pipe">Pipe</option>
                    </select>
                    {form.filterAction === 'forward' && (
                      <input type="email" value={form.filterDest} onChange={(e) => setForm({ ...form, filterDest: e.target.value })}
                        className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="Destination" />
                    )}
                    <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm">Add</button>
                  </div>
                </form>
                {currentEmail.filters.length === 0 ? (
                  <p className="text-sm text-surface-400 italic">No filters configured</p>
                ) : (
                  <div className="space-y-2">
                    {currentEmail.filters.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                        <div className="text-sm">
                          <span className="text-surface-900 dark:text-white font-medium">{f.name}</span>
                          <span className="text-surface-300 mx-2">&middot;</span>
                          <span className="text-surface-500 dark:text-surface-400">{f.rule}: &ldquo;{f.pattern}&rdquo;</span>
                          <span className="text-surface-300 mx-2">&rarr;</span>
                          <span className="text-surface-500 dark:text-surface-400">{f.action}</span>
                        </div>
                        <button onClick={() => handleDeleteFilter(currentEmail.id, f.id)} className="p-1 text-surface-400 hover:text-red-500">
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
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : emails.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Mail className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No Email Accounts</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Create your first email account to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition inline-flex items-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Create Email Account
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Usage</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Forwarders</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Filters</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition cursor-pointer" onClick={() => setSelectedEmail(email)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-surface-900 dark:text-white">{email.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(Math.round((email.usedSpace / email.quota) * 100), 100)}%` }} />
                      </div>
                      <span className="text-sm text-surface-500 dark:text-surface-400">{formatMB(email.usedSpace)} / {formatMB(email.quota)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{email._count.forwarders}</td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{email._count.filters}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${email.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {email.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEmail(email.id); }} className="p-1 text-surface-400 hover:text-red-500 transition">
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
