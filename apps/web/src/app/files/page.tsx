'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  FolderOpen,
  File,
  FileText,
  Image,
  Code,
  ArrowLeft,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  Edit3,
  X,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  permissions: string;
}

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<{ item: FileItem; name: string } | null>(null);
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchFiles(token, currentPath);
  }, [router, currentPath]);

  const getToken = () => localStorage.getItem('token');

  const fetchFiles = async (token?: string, path?: string) => {
    const t = token || getToken();
    if (!t) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path || currentPath)}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!response.ok) { if (response.status === 401) router.push('/login'); throw new Error('Failed to fetch files'); }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getToken();
    if (!token) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      setSuccess(`File "${file.name}" uploaded`);
      setTimeout(() => setSuccess(''), 3000);
      fetchFiles(token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !newFolderName) return;

    try {
      const response = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}` }),
      });
      if (!response.ok) throw new Error('Failed to create folder');
      setShowNewFolder(false);
      setNewFolderName('');
      fetchFiles(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Delete "${item.name}"? ${item.type === 'directory' ? 'All contents will be removed.' : ''}`)) return;
    const token = getToken();
    if (!token) return;

    try {
      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const response = await fetch(`/api/files?path=${encodeURIComponent(itemPath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchFiles(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDownload = async (item: FileItem) => {
    const token = getToken();
    if (!token) return;

    try {
      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(itemPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const data = await response.json();

      const byteCharacters = atob(data.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRename = async (item: FileItem) => {
    setRenaming({ item, name: item.name });
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming) return;

    const token = getToken();
    if (!token) return;

    try {
      const oldPath = currentPath === '/' ? `/${renaming.item.name}` : `${currentPath}/${renaming.item.name}`;
      const newPath = currentPath === '/' ? `/${renaming.name}` : `${currentPath}/${renaming.name}`;
      const response = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (!response.ok) throw new Error('Failed to rename');
      setRenaming(null);
      fetchFiles(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewFile = async (item: FileItem) => {
    const token = getToken();
    if (!token) return;

    try {
      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(itemPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to read file');
      const data = await response.json();
      setViewingFile({ path: itemPath, content: data.content });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditFile = async (item: FileItem) => {
    const token = getToken();
    if (!token) return;

    try {
      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(itemPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to read file');
      const data = await response.json();
      setEditingFile({ path: itemPath, content: data.content });
      setEditContent(data.content);
      setViewingFile(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: editingFile.path, content: editContent }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setEditingFile(null);
      setSuccess('File saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const handleClickItem = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
    } else {
      handleViewFile(item);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'directory') return <FolderOpen className="w-5 h-5 text-yellow-500" />;
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return <Image className="w-5 h-5 text-purple-500" />;
      case 'html': case 'css': case 'js': case 'ts': case 'jsx': case 'tsx': return <Code className="w-5 h-5 text-blue-500" />;
      case 'txt': case 'md': case 'log': return <FileText className="w-5 h-5 text-gray-500" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
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
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">File Manager</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => fetchFiles()} className="p-2 text-gray-400 hover:text-gray-600" title="Refresh">
                <RefreshCw className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => setShowNewFolder(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
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
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* New Folder Modal */}
        {showNewFolder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">New Folder</h3>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="folder name"
                  autoFocus
                  required
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewFolder(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" /> Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* File Viewer Modal */}
        {viewingFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">{viewingFile.path}</h3>
                <button onClick={() => setViewingFile(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 overflow-auto flex-1">
                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{viewingFile.content}</pre>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={() => { setEditingFile(viewingFile); setEditContent(viewingFile.content); setViewingFile(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => setViewingFile(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* File Editor Modal */}
        {editingFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">Editing: {editingFile.path}</h3>
                <button onClick={() => setEditingFile(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={submitEdit} className="flex flex-col flex-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 p-4 font-mono text-sm outline-none resize-none min-h-[300px]"
                  spellCheck={false}
                />
                <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingFile(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 flex items-center gap-2">
                    {saving ? 'Saving...' : <>
                      <Check className="w-4 h-4" /> Save
                    </>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => setCurrentPath('/')} className="hover:text-gray-700">home</button>
          {currentPath.split('/').filter(Boolean).map((part, index) => (
            <span key={index} className="flex items-center gap-2">
              <span>/</span>
              <button onClick={() => setCurrentPath('/' + currentPath.split('/').filter(Boolean).slice(0, index + 1).join('/'))} className="hover:text-gray-700">{part}</button>
            </span>
          ))}
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-4">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">This folder is empty</h3>
              <p className="text-gray-500">Upload a file or create a new folder to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Modified</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Perms</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleClickItem(item)}>
                    <td className="px-6 py-4">
                      {renaming?.item.name === item.name ? (
                        <form onSubmit={submitRename} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renaming.name}
                            onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setRenaming(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3">
                          {getFileIcon(item)}
                          <span className="text-gray-900">{item.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.type === 'directory' ? '-' : formatSize(item.size)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.modified).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.permissions}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {item.type === 'file' && (
                          <>
                            <button onClick={() => handleDownload(item)} className="p-1.5 text-gray-400 hover:text-blue-600 transition" title="Download">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditFile(item)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleRename(item)} className="p-1.5 text-gray-400 hover:text-gray-600 transition" title="Rename">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
