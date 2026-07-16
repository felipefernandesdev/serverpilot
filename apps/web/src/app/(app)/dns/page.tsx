'use client';

import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  records: { content: string; disabled: boolean }[];
}

export default function DnsPage() {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accountDomain, setAccountDomain] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'A', content: '', ttl: 3600 });

  useEffect(() => {
    const account = localStorage.getItem('account');
    if (account) {
      const parsed = JSON.parse(account);
      setAccountDomain(parsed.domain);
      fetchRecords(parsed.domain);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchRecords = async (domain?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const d = domain || accountDomain;
    if (!d) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dns/records?domain=${encodeURIComponent(d)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch DNS records');
      setRecords(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/dns/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: accountDomain, name: form.name, type: form.type, content: form.content, ttl: form.ttl }),
      });
      if (!res.ok) throw new Error('Failed to add record');
      setShowAdd(false);
      setForm({ name: '', type: 'A', content: '', ttl: 3600 });
      setSuccess('DNS record added');
      setTimeout(() => setSuccess(''), 3000);
      fetchRecords();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRecord = async (record: DnsRecord) => {
    if (!confirm(`Delete ${record.type} record "${record.name}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/dns/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: accountDomain, name: record.name, type: record.type }),
      });
      if (!res.ok) throw new Error('Failed to delete record');
      setSuccess('DNS record deleted');
      setTimeout(() => setSuccess(''), 3000);
      fetchRecords();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">DNS Manager</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{accountDomain || 'No domain'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchRecords()} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> Add Record
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

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-sm animate-fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">&times;</button>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Add DNS Record</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white"
                    placeholder="www, @, mail" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white">
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="MX">MX</option>
                    <option value="TXT">TXT</option>
                    <option value="NS">NS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Value</label>
                <input type="text" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white font-mono"
                  placeholder="127.0.0.1" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Globe className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No DNS Records</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Add your first DNS record to get started.</p>
          <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition inline-flex items-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Add Record
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Value</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">TTL</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {records.map((record, i) => (
                <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition">
                  <td className="px-6 py-4">
                    <span className="font-medium text-surface-900 dark:text-white">{record.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-mono bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded">{record.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-surface-500 dark:text-surface-400 font-mono">
                      {record.records.map((r) => r.content).join(', ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{record.ttl}s</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteRecord(record)} className="p-1.5 text-surface-400 hover:text-red-500 transition" title="Delete">
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
