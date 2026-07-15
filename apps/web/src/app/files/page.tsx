'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchFiles(token, currentPath);
  }, [router, currentPath]);

  const fetchFiles = async (token: string, path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files');
    } finally {
      setLoading(false);
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
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <Image className="w-5 h-5 text-purple-500" />;
      case 'html':
      case 'css':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <Code className="w-5 h-5 text-blue-500" />;
      case 'txt':
      case 'md':
      case 'log':
        return <FileText className="w-5 h-5 text-gray-500" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
    }
  };

  const handleBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length ? `/${parts.join('/')}` : '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => setCurrentPath('/')} className="hover:text-gray-700">
            home
          </button>
          {currentPath.split('/').filter(Boolean).map((part, index) => (
            <span key={index} className="flex items-center gap-2">
              <span>/</span>
              <button
                onClick={() => {
                  const newPath = '/' + currentPath.split('/').filter(Boolean).slice(0, index + 1).join('/');
                  setCurrentPath(newPath);
                }}
                className="hover:text-gray-700"
              >
                {part}
              </button>
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
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-4">This folder is empty</p>
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
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleClick(item)}
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      {getFileIcon(item)}
                      <span className="text-gray-900">{item.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.type === 'directory' ? '-' : formatSize(item.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.modified).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {item.permissions}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
