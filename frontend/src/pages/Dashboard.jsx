import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('surat'); // 'surat' atau 'pengaduan'
  const [suratList, setSuratList] = useState([]);
  const [pengaduanList, setPengaduanList] = useState([]);
  const [formData, setFormData] = useState({ jenisSurat: 'Surat Domisili', keperluan: '', judul: '', deskripsi: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [resSurat, resPengaduan] = await Promise.all([
        api.get('/surat'),
        api.get('/pengaduan')
      ]);
      setSuratList(resSurat.data);
      setPengaduanList(resPengaduan.data);
    } catch (err) {
      console.error("Gagal mengambil data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const submitSurat = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/surat', { jenisSurat: formData.jenisSurat, keperluan: formData.keperluan });
      setFormData({ ...formData, keperluan: '' });
      fetchData();
      alert("Pengajuan surat berhasil dikirim!");
    } catch (err) {
      alert("Gagal mengajukan surat");
    } finally {
      setLoading(false);
    }
  };

  const submitPengaduan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/pengaduan', { judul: formData.judul, deskripsi: formData.deskripsi });
      setFormData({ ...formData, judul: '', deskripsi: '' });
      fetchData();
      alert("Pengaduan berhasil dikirim!");
    } catch (err) {
      alert("Gagal mengirim pengaduan");
    } finally {
      setLoading(false);
    }
  };

const handleDelete = async (id) => {
  if (window.confirm("Yakin ingin membatalkan pengajuan ini?")) {
    try {
      await api.delete(`/surat/${id}`);
      fetchData(); // Refresh daftar
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menghapus");
    }
  }
};

const handleDeletePengaduan = async (id) => {
  if (window.confirm("Batalkan laporan pengaduan ini?")) {
    try {
      await api.delete(`/pengaduan/${id}`);
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menghapus");
    }
  }
};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">DesaDigital Masyarakat</h1>
        <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition">Keluar</button>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Kolom Kiri: Form Input */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setActiveTab('surat')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'surat' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>PENGAJUAN SURAT</button>
                <button onClick={() => setActiveTab('pengaduan')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'pengaduan' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>PENGADUAN</button>
              </div>

              {activeTab === 'surat' ? (
                <form onSubmit={submitSurat} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Jenis Surat</label>
                    <select className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setFormData({...formData, jenisSurat: e.target.value})}>
                      <option>Surat Domisili</option>
                      <option>Surat Keterangan Usaha</option>
                      <option>Surat Belum Menikah</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Keperluan</label>
                    <textarea className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24"
                      placeholder="Contoh: Untuk persyaratan beasiswa" required
                      value={formData.keperluan} onChange={e => setFormData({...formData, keperluan: e.target.value})}></textarea>
                  </div>
                  <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition active:scale-95 disabled:opacity-50">
                    {loading ? 'Memproses...' : 'Kirim Pengajuan'}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitPengaduan} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Subjek Pengaduan</label>
                    <input type="text" className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Judul laporan" required
                      value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Isi Laporan</label>
                    <textarea className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24"
                      placeholder="Ceritakan kendala Anda..." required
                      value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})}></textarea>
                  </div>
                  <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition active:scale-95 disabled:opacity-50">
                    Kirim Laporan
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Tracking List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
              Status Layanan Anda
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {/* Render Surat */}
              {suratList.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">{item.jenisSurat}</p>
                    <p className="text-slate-700 font-medium">{item.keperluan}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {item.status}
                    </span>
                    
                    {/* Tombol Hapus: Hanya muncul jika status pending */}
                    {item.status === 'pending' && (
                        <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                        Batalkan
                        </button>
                    )}
                    
                    {item.fileUrl && (
                        <a href={`http://localhost:5000${item.fileUrl}`} target="_blank" className="text-xs text-blue-500 font-bold hover:underline italic">
                        Download PDF
                        </a>
                    )}
                    </div>
                </div>
                ))}

              {/* Render Pengaduan */}
              {pengaduanList.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-orange-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.judul}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.deskripsi}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">
                        {item.status}
                      </span>
                      {/* Tombol Hapus Masyarakat */}
                      {item.status === 'pending' && (
                        <button 
                          onClick={() => handleDeletePengaduan(item.id)}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {suratList.length === 0 && pengaduanList.length === 0 && (
                <div className="text-center py-20 text-slate-400 italic">Belum ada riwayat layanan.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;