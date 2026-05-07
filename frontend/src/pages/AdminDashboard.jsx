import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [suratList, setSuratList] = useState([]);
  const [pengaduanList, setPengaduanList] = useState([]);
  const navigate = useNavigate();

  const fetchAllData = async () => {
    try {
      const [resSurat, resPengaduan] = await Promise.all([
        api.get('/surat'),
        api.get('/pengaduan')
      ]);
      setSuratList(resSurat.data);
      setPengaduanList(resPengaduan.data);
    } catch (err) {
      console.error("Gagal mengambil data admin", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/surat/${id}/status`, { status: newStatus });
      alert(`Surat berhasil di-${newStatus}`);
      fetchAllData(); // Refresh data
    } catch (err) {
      alert("Gagal memperbarui status");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleDelete = async (id) => {
    if (window.confirm("Admin: Hapus permanen data ini?")) {
      try {
        await api.delete(`/surat/${id}`);
        fetchAllData(); // Refresh daftar
      } catch (err) {
        alert("Gagal menghapus");
      }
    }
  };

  const handleDeletePengaduan = async (id) => {
    if (window.confirm("Admin: Hapus pengaduan ini secara permanen?")) {
      try {
        await api.delete(`/pengaduan/${id}`);
        fetchAllData();
      } catch (err) {
        alert("Gagal menghapus");
      }
    }
  };

  const handleSelesaikan = async (id) => {
  try {
    await api.put(`/pengaduan/${id}/status`, { status: 'selesai' });
    alert("Laporan ditandai sebagai selesai.");
    fetchAllData(); // Refresh tampilan
  } catch (err) {
    alert("Gagal memproses pengaduan.");
  }
};

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-800">Panel Admin Desa Digital</h1>
        <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100">Keluar</button>
      </nav>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 gap-8">
        {/* Seksi Manajemen Surat */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            Daftar Pengajuan Surat Warga
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">NIK</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nama Pemohon</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Jenis Surat</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Keperluan</th> {/* Kolom Baru */}
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {suratList.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="p-4 text-sm font-mono text-slate-600">{s.nik}</td>
                    <td className="p-4 text-sm font-bold text-slate-800">{s.nama}</td>
                    <td className="p-4 text-sm text-blue-600 font-medium">{s.jenisSurat}</td>
                    
                    {/* Kolom Keperluan dengan batasan lebar agar tidak berantakan jika teks panjang */}
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={s.keperluan}>
                      {s.keperluan}
                    </td>

                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    
                    <td className="p-4 flex justify-center gap-2">
                      {s.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateStatus(s.id, 'approved')} 
                            className="bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-green-700 transition"
                          >
                            Setujui
                          </button>
                          <button 
                            onClick={() => updateStatus(s.id, 'rejected')} 
                            className="bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-red-700 transition"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="bg-slate-200 text-slate-600 px-3 py-1 rounded-md text-xs font-bold hover:bg-red-500 hover:text-white transition"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Seksi Manajemen Pengaduan */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
            Laporan Pengaduan Masuk
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pengaduanList.map((p) => (
              <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    {/* Menampilkan Nama dan NIK pelapor */}
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Pelapor: {p.nama}</p>
                    <p className="text-[10px] font-mono text-slate-400">{p.nik}</p>
                    <h3 className="font-bold text-slate-800 text-lg mt-1">{p.judul}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {p.deskripsi}
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    Status: {p.status}
                  </span>
                  
                  <div className="flex gap-3">
                    {p.status === 'pending' && (
                      <button 
                        onClick={() => handleSelesaikan(p.id)} // <--- Tambahkan ini
                        className="text-blue-600 text-xs font-bold hover:underline transition"
                      >
                        Selesaikan
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeletePengaduan(p.id)}
                      className="text-red-500 text-xs font-bold hover:underline transition"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;