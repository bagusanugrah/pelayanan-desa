import { useState, useEffect } from 'react';
import api from '../api/axios';

const TestAPI = () => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [baseURL, setBaseURL] = useState('');

  useEffect(() => {
    // Show base URL yang dipakai
    setBaseURL(api.defaults.baseURL);
  }, []);

  const testConnection = async () => {
    setStatus('loading');
    setResponse(null);
    setError(null);

    try {
      const res = await api.get('/');
      setStatus('success');
      setResponse(res.data);
    } catch (err) {
      setStatus('error');
      setError({
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">🔧 API Connection Test</h1>
        <p className="text-slate-600 mb-6">Debugging tools untuk ngecek koneksi ke backend</p>

        {/* Base URL Info */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-600 mb-1">Base URL yang digunakan:</p>
          <p className="font-mono text-sm bg-white p-2 rounded border border-slate-300 break-all">
            {baseURL || 'Loading...'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            📌 Dari: import.meta.env.VITE_API_BASE_URL atau fallback ke localhost
          </p>
        </div>

        {/* Test Button */}
        <button
          onClick={testConnection}
          disabled={status === 'loading'}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition mb-6 ${
            status === 'loading'
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
        >
          {status === 'loading' ? '⏳ Mencoba Koneksi...' : '🚀 Test Koneksi ke Backend'}
        </button>

        {/* Success Response */}
        {status === 'success' && response && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-700 mb-2">✅ Koneksi Berhasil!</h3>
            <div className="bg-white p-3 rounded border border-green-200 font-mono text-xs overflow-auto">
              <pre>{JSON.stringify(response, null, 2)}</pre>
            </div>
            <p className="text-xs text-green-600 mt-2">Backend sedang aktif dan bisa diakses.</p>
          </div>
        )}

        {/* Error Response */}
        {status === 'error' && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-700 mb-2">❌ Koneksi Gagal!</h3>
            
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-600 font-bold">Error Message:</p>
                <p className="text-red-600 font-mono bg-white p-2 rounded border border-red-200">
                  {error.message}
                </p>
              </div>

              {error.code && (
                <div>
                  <p className="text-slate-600 font-bold">Error Code:</p>
                  <p className="text-red-600 font-mono bg-white p-2 rounded border border-red-200">
                    {error.code}
                  </p>
                </div>
              )}

              {error.url && (
                <div>
                  <p className="text-slate-600 font-bold">URL yang diakses:</p>
                  <p className="text-red-600 font-mono bg-white p-2 rounded border border-red-200 break-all">
                    {error.url}
                  </p>
                </div>
              )}

              {error.status && (
                <div>
                  <p className="text-slate-600 font-bold">HTTP Status:</p>
                  <p className="text-red-600 font-mono bg-white p-2 rounded border border-red-200">
                    {error.status}
                  </p>
                </div>
              )}

              {error.data && (
                <div>
                  <p className="text-slate-600 font-bold">Response Data:</p>
                  <div className="bg-white p-3 rounded border border-red-200 font-mono text-xs overflow-auto">
                    <pre>{JSON.stringify(error.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <p className="font-bold mb-1">💡 Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Pastikan backend EC2 sedang running</li>
                <li>Cek IP private backend di .env dan nginx.conf</li>
                <li>Pastikan security group backend allow port 5000 dari VPC</li>
                <li>Cek CORS setting di backend (server.js)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAPI;
