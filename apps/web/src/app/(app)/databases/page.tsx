'use client';

import { useEffect, useState } from 'react';
import {
  Database, Plus, Trash2, RefreshCw, AlertCircle, User, Eye, EyeOff,
} from 'lucide-react';

interface DatabaseItem {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  users: DatabaseUser[];
}

interface DatabaseUser {
  id: string;
  username: string;
  privileges: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDb, setSelectedDb] = useState<DatabaseItem | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [form, setForm] = useState({
    name: '', type: 'mysql',
    username: '', password: '', privileges: 'ALL PRIVILEGES',
  });

  useEffect(() => { fetchDatabases(); }, []);

  const fetchDatabases = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/databases', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to fetch databases');
      setDatabases(await res.json());
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, type: form.type }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setShowCreate(false); setForm({ ...form, name: '', type: 'mysql' }); fetchDatabases();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this database? All associated users will also be removed.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/databases/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (selectedDb?.id === id) setSelectedDb(null);
      fetchDatabases();
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDb) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/databases/${selectedDb.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: form.username, password: form.password, privileges: form.privileges }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setShowCreateUser(false);
      setForm({ ...form, username: '', password: '', privileges: 'ALL PRIVILEGES' });
      setGeneratedPassword('');
      fetchDatabases();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteUser = async (databaseId: string, userId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/databases/${databaseId}/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchDatabases();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Databases</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{databases.length} databases</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchDatabases()} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> New Database
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
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Create Database</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Database Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition dark:text-white" placeholder="my_database" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition dark:text-white">
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDb && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDb(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">{selectedDb.name}</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400">{selectedDb.type} &middot; {selectedDb.users.length} user(s)</p>
              </div>
              <button onClick={() => setSelectedDb(null)} className="text-surface-400 hover:text-surface-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-surface-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4" /> Users</h4>
                <button onClick={() => { setShowCreateUser(true); generatePassword(); }} className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add User
                </button>
              </div>

              {showCreateUser && (
                <form onSubmit={handleCreateUser} className="mb-4 p-4 bg-surface-50 dark:bg-surface-900/50 rounded-xl space-y-3 animate-fade-in">
                  <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="Username" required />
                  <div className="flex gap-2">
                    <input type={passwordVisible ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="flex-1 px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white" placeholder="Password" required minLength={6} />
                    <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="p-2.5 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-500">
                      {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <select value={form.privileges} onChange={(e) => setForm({ ...form, privileges: e.target.value })}
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-xl text-sm dark:text-white">
                    <option value="ALL PRIVILEGES">All Privileges</option>
                    <option value="SELECT, INSERT, UPDATE, DELETE">Read/Write</option>
                    <option value="SELECT">Read Only</option>
                  </select>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCreateUser(false)} className="px-3 py-1.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-700 dark:text-surface-300">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-sm">Create</button>
                  </div>
                </form>
              )}

              {selectedDb.users.length === 0 ? (
                <p className="text-sm text-surface-400 italic">No users configured</p>
              ) : (
                <div className="space-y-2">
                  {selectedDb.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                      <div className="text-sm">
                        <span className="text-surface-900 dark:text-white font-medium">{u.username}</span>
                        <span className="text-surface-300 mx-2">&middot;</span>
                        <span className="text-surface-500 dark:text-surface-400">{u.privileges}</span>
                      </div>
                      <button onClick={() => handleDeleteUser(selectedDb.id, u.id)} className="p-1 text-surface-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : databases.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-12 text-center animate-fade-in">
          <Database className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No Databases</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Create your first database to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition inline-flex items-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Create Database
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Users</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {databases.map((db) => (
                <tr key={db.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition cursor-pointer" onClick={() => setSelectedDb(db)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                        <Database className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-surface-900 dark:text-white">{db.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 uppercase">
                      {db.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{db.users.length}</td>
                  <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">
                    {new Date(db.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(db.id); }} className="p-1 text-surface-400 hover:text-red-500 transition">
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
