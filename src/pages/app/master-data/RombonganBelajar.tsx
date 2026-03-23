import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function RombonganBelajar() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Relational Data
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [tingkatKelasList, setTingkatKelasList] = useState<any[]>([]);
  const [activeTahunAjaran, setActiveTahunAjaran] = useState<any>(null);

  const [formData, setFormData] = useState<any>({
    nama: '',
    jurusan_id: '',
    tahun_masuk_id: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Kelola Siswa State
  const [isKelolaSiswaOpen, setIsKelolaSiswaOpen] = useState(false);
  const [selectedRombel, setSelectedRombel] = useState<any>(null);
  const [allSiswa, setAllSiswa] = useState<any[]>([]);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [searchSiswa, setSearchSiswa] = useState('');

  const formatSemester = (sem: string) => {
    if (sem === 'Semester 1') return 'Semester Ganjil';
    if (sem === 'Semester 2') return 'Semester Genap';
    return sem;
  };

  useEffect(() => {
    fetchData();
    fetchRelations();
  }, []);

  const fetchRelations = async () => {
    try {
      const [jurusanRes, taRes, tkRes] = await Promise.all([
        supabase.from('jurusan').select('id, nama'),
        supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: true }),
        supabase.from('tingkat_kelas').select('*').order('urutan', { ascending: true })
      ]);
      
      setJurusanList(jurusanRes.data || []);
      const taData = taRes.data || [];
      setTahunAjaranList(taData);
      setTingkatKelasList(tkRes.data || []);
      
      const active = taData.find(ta => ta.is_active);
      if (active) setActiveTahunAjaran(active);
    } catch (err) {
      console.error('Error fetching relations:', err);
    }
  };

  const getTingkatKelas = (tahunMasukId: string) => {
    if (!tahunMasukId || !activeTahunAjaran || tahunAjaranList.length === 0 || tingkatKelasList.length === 0) return '-';
    
    const masukIndex = tahunAjaranList.findIndex(ta => ta.id === tahunMasukId);
    const activeIndex = tahunAjaranList.findIndex(ta => ta.id === activeTahunAjaran.id);
    
    if (masukIndex === -1 || activeIndex === -1) return '-';
    
    // Calculate difference in years (assuming each tahun_ajaran is 1 year/semester, wait, if semester is included, there might be 2 per year)
    // Let's assume urutan increases by 1 for each year. If tahun_ajaran includes semesters, we might need to group by year.
    // For simplicity, let's just use the index difference. If they create 1 tahun ajaran per year, diff is exactly the year diff.
    // Let's filter unique years from tahun_ajaran to calculate year difference.
    const uniqueYears = Array.from(new Set(tahunAjaranList.map(ta => ta.nama)));
    const masukTa = tahunAjaranList[masukIndex];
    const activeTa = tahunAjaranList[activeIndex];
    
    const masukYearIndex = uniqueYears.indexOf(masukTa.nama);
    const activeYearIndex = uniqueYears.indexOf(activeTa.nama);
    
    if (masukYearIndex === -1 || activeYearIndex === -1) return '-';
    
    const diff = activeYearIndex - masukYearIndex;
    const currentUrutan = diff + 1;
    
    const tingkat = tingkatKelasList.find(tk => tk.urutan === currentUrutan);
    
    if (diff < 0) return 'Belum Masuk';
    if (!tingkat) return `Lulus / Urutan ${currentUrutan}`;
    
    return tingkat.nama;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('rombongan_belajar')
        .select(`
          *,
          jurusan (nama),
          tahun_masuk:tahun_ajaran!tahun_masuk_id (nama, semester),
          anggota_rombel (count)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nama: formData.nama,
        jurusan_id: formData.jurusan_id || null,
        tahun_masuk_id: formData.tahun_masuk_id || null
      };

      if (editingId) {
        await supabase.from('rombongan_belajar').update(payload).eq('id', editingId);
      } else {
        await supabase.from('rombongan_belajar').insert([payload]);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await supabase.from('rombongan_belajar').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nama: item.nama,
        jurusan_id: item.jurusan_id || '',
        tahun_masuk_id: item.tahun_masuk_id || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nama: '',
        jurusan_id: '',
        tahun_masuk_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const openKelolaSiswa = async (rombel: any) => {
    setSelectedRombel(rombel);
    setSearchSiswa('');
    try {
      const { data: siswaData } = await supabase.from('siswa').select('id, nis, nama_lengkap').order('nama_lengkap');
      setAllSiswa(siswaData || []);

      const { data: anggotaData } = await supabase.from('anggota_rombel').select('siswa_id').eq('rombongan_belajar_id', rombel.id);
      setSelectedSiswaIds(anggotaData?.map(a => a.siswa_id) || []);
      
      setIsKelolaSiswaOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSiswa = (siswaId: string) => {
    setSelectedSiswaIds(prev => 
      prev.includes(siswaId) 
        ? prev.filter(id => id !== siswaId)
        : [...prev, siswaId]
    );
  };

  const handleSaveKelolaSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Delete existing
      await supabase.from('anggota_rombel').delete().eq('rombongan_belajar_id', selectedRombel.id);
      
      // Insert new
      if (selectedSiswaIds.length > 0) {
        const inserts = selectedSiswaIds.map(id => ({
          rombongan_belajar_id: selectedRombel.id,
          siswa_id: id
        }));
        await supabase.from('anggota_rombel').insert(inserts);
      }
      setIsKelolaSiswaOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan anggota rombel.');
    }
  };

  const filteredSiswa = allSiswa.filter(s => 
    s.nama_lengkap.toLowerCase().includes(searchSiswa.toLowerCase()) || 
    s.nis.includes(searchSiswa)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rombongan Belajar</h1>
          <p className="text-slate-500 mt-1">Kelola rombongan belajar, relasi jurusan, dan tahun ajaran</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Rombel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari rombongan belajar..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Rombel</th>
                <th className="px-6 py-4">Jurusan</th>
                <th className="px-6 py-4">Tahun Masuk</th>
                <th className="px-6 py-4">Tingkat Saat Ini</th>
                <th className="px-6 py-4 text-center">Jml Siswa</th>
                <th className="px-6 py-4 text-center">Anggota</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">Tidak ada data</td></tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nama}</td>
                    <td className="px-6 py-4">{item.jurusan?.nama || '-'}</td>
                    <td className="px-6 py-4">{item.tahun_masuk ? `${item.tahun_masuk.nama} - ${formatSemester(item.tahun_masuk.semester)}` : '-'}</td>
                    <td className="px-6 py-4 font-medium text-primary">
                      {getTingkatKelas(item.tahun_masuk_id)}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {item.anggota_rombel?.[0]?.count || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => openKelolaSiswa(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" /> Kelola Siswa
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'Tambah'} Rombongan Belajar</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Rombel</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Contoh: Rombel X IPA 1 - 2023/2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jurusan</label>
                <select
                  value={formData.jurusan_id}
                  onChange={(e) => setFormData({ ...formData, jurusan_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="">-- Pilih Jurusan --</option>
                  {jurusanList.map(j => (
                    <option key={j.id} value={j.id}>{j.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Masuk</label>
                <select
                  value={formData.tahun_masuk_id}
                  onChange={(e) => setFormData({ ...formData, tahun_masuk_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="">-- Pilih Tahun Masuk --</option>
                  {tahunAjaranList.map(ta => (
                    <option key={ta.id} value={ta.id}>{ta.nama} - {formatSemester(ta.semester)}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Siswa di rombel ini otomatis terhitung Tingkat 1 pada tahun masuk ini.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Siswa */}
      {isKelolaSiswaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Kelola Siswa</h3>
                <p className="text-sm text-slate-500">{selectedRombel?.nama}</p>
              </div>
              <button onClick={() => setIsKelolaSiswaOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Cari nama atau NIS siswa..." 
                    value={searchSiswa}
                    onChange={(e) => setSearchSiswa(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
                  />
                </div>
                <div className="text-sm font-medium text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  Terpilih: <span className="text-primary">{selectedSiswaIds.length}</span> siswa
                </div>
              </div>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 w-16 text-center">Pilih</th>
                    <th className="px-6 py-3">NIS</th>
                    <th className="px-6 py-3">Nama Lengkap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Siswa tidak ditemukan</td></tr>
                  ) : (
                    filteredSiswa.map((siswa) => {
                      const isSelected = selectedSiswaIds.includes(siswa.id);
                      return (
                        <tr 
                          key={siswa.id} 
                          onClick={() => handleToggleSiswa(siswa.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-6 py-3 text-center">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-primary mx-auto" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="px-6 py-3 font-mono text-slate-500">{siswa.nis}</td>
                          <td className="px-6 py-3 font-medium text-slate-900">{siswa.nama_lengkap}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={() => setIsKelolaSiswaOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                Batal
              </button>
              <button onClick={handleSaveKelolaSiswa} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
                Simpan Anggota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
