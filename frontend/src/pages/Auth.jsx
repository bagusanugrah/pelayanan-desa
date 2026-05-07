import { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nik: '', nama: '', password: '', nik_or_username: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        // Logika Login
        const loginData = { 
          nik_or_username: formData.nik || formData.nik_or_username, 
          password: formData.password 
        };
        const res = await api.post('/login', loginData);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        navigate(res.data.role === 'admin' ? '/admin-dashboard' : '/dashboard');
      } else {
        // Logika Register
        await api.post('/register', formData);
        alert('Registrasi Berhasil! Silakan Login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-2xl font-bold">Sistem Desa Digital</h1>
          <p className="text-blue-100 text-sm mt-2">Pelayanan Publik Kelurahan [cite: 15]</p>
        </div>
        
        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${isLogin ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Login</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${!isLogin ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Daftar</button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input type="text" placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                onChange={e => setFormData({...formData, nama: e.target.value})} required />
            )}
            <input type="text" placeholder={isLogin ? "NIK / Username Admin" : "NIK Sesuai KTP"} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition" 
              onChange={e => setFormData({...formData, nik: e.target.value, nik_or_username: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition" 
              onChange={e => setFormData({...formData, password: e.target.value})} required />
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition active:scale-95">
              {isLogin ? 'Masuk ke Layanan' : 'Buat Akun Sekarang'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;