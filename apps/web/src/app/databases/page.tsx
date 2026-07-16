'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Plus,
  Trash2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  User,
  Eye,
  EyeOff,
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
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDb, setSelectedDb] = useState<DatabaseItem | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [form, setForm] = useState({
    name: '',
    type: 'mysql',
    username: '',
    password: '',
    privileges: 'ALL PRIVILEGES',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDatabases(token);
  }, [router]);

  const fetchDatabases = async (token?: string) => {
    const t = token || localStorage.getItem('token');
    if (!t) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/databases', {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch databases');
      }

      const data = await response.json();
      setDatabases(data);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/databases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: form.name, type: form.type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create database');
      }

      setShowCreate(false);
      setForm({ ...form, name: '', type: 'mysql' });
      fetchDatabases(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this database? All associated users will also be removed.')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/databases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete database');

      if (selectedDb?.id === id) setSelectedDb(null);
      fetchDatabases(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDb) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/databases/${selectedDb.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          privileges: form.privileges,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create user');
      }

      setShowCreateUser(false);
      setForm({ ...form, username: '', password: '', privileges: 'ALL PRIVILEGES' });
      setGeneratedPassword('');
      fetchDatabases(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (databaseId: string, userId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`/api/databases/${databaseId}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDatabases(token);
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
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Databases</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => fetchDatabases()} className="p-2 text-gray-400 hover:text-gray-600" title="Refresh">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Database
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Database</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="my_database"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedDb && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDb.name}</h3>
                  <p className="text-sm text-gray-500">{selectedDb.type} &middot; {selectedDb.users.length} user(s)</p>
                </div>
                <button onClick={() => setSelectedDb(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2"><User className="w-4 h-4" /> Users</h4>
                  <button onClick={() => { setShowCreateUser(true); generatePassword(); }} className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add User
                  </button>
                </div>

                {showCreateUser && (
                  <form onSubmit={handleCreateUser} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="Username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <div className="flex gap-2">
                      <input
                        type={passwordVisible ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Password"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <select
                      value={form.privileges}
                      onChange={(e) => setForm({ ...form, privileges: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="ALL PRIVILEGES">All Privileges</option>
                      <option value="SELECT, INSERT, UPDATE, DELETE">Read/Write</option>
                      <option value="SELECT">Read Only</option>
                    </select>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowCreateUser(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
                      <button type="submit" className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm">Create</button>
                    </div>
                  </form>
                )}

                {selectedDb.users.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No users configured</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDb.users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm">
                          <span className="text-gray-900 font-medium">{u.username}</span>
                          <span className="text-gray-400 mx-2">&middot;</span>
                          <span className="text-gray-500">{u.privileges}</span>
                        </div>
                        <button onClick={() => handleDeleteUser(selectedDb.id, u.id)} className="p-1 text-gray-400 hover:text-red-500">
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
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Loading databases...</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases</h3>
            <p className="text-gray-500 mb-6">Create your first database to get started.</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /> Create Database
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {databases.map((db) => (
                  <tr key={db.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDb(db)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                          <Database className="w-4 h-4" />
                        </div>
                        <span className="text-gray-900 font-medium">{db.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 uppercase">
                        {db.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{db.users.length}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(db.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(db.id); }} className="p-1 text-gray-400 hover:text-red-500 transition">
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
