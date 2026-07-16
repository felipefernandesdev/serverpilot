'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-surface-900 dark:to-surface-800">
      <div className="w-full max-w-md p-8">
        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Server className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">ServerHQ</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">Admin Control Panel</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition dark:text-white"
                  placeholder="admin@serverpilot.local" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition dark:text-white"
                  placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium mb-2">Demo Credentials:</p>
            <p className="text-xs text-surface-600 dark:text-surface-400">Email: admin@serverpilot.local</p>
            <p className="text-xs text-surface-600 dark:text-surface-400">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
