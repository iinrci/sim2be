import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Plus, Search, Loader2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Rombel {
  id: string;
  nama: string;
}

interface Jadwal {
  id: string;
  mata_pelajaran: { nama: string };
  jam_mulai: string;
  jam_selesai: string;
}

interface SiswaAbsensi {
  id: string;
  nis: string;
  nama_lengkap: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa' | null;
  keterangan: string;
}

export default function Absensi() {
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tingkatKelasList, setTingkatKelasList] = useState<any[]>([]);
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [jadwals, setJadwals] = useState<Jadwal[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaAbsensi[]>([]);
  
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterTingkatKelas, setFilterTingkatKelas] = useState('');
  const [selectedRombelId, setSelectedRombelId] = useState('');
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  const [selectedTanggal, setSelectedTanggal] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const formatSemester = (sem: string) => {
    if (sem === 'Semester 1') return 'Ganjil';
    if (sem === 'Semester 2') return 'Genap';
    return sem;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const jadwalId = await fetchJadwal();
      fetchSiswa(selectedRombelId, jadwalId, selectedTanggal);
    };
    loadData();
  }, [selectedRombelId, selectedTanggal]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [taRes, jurRes, tkRes, rombelRes] = await Promise.all([
        supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: false }),
        supabase.from('jurusan').select('*'),
        supabase.from('tingkat_kelas').select('*'),
        supabase.from('rombongan_belajar').select('id, nama, tahun_masuk_id, jurusan_id').order('nama')
      ]);
      
      setTahunAjaranList(taRes.data || []);
      setJurusanList(jurRes.data || []);
      setTingkatKelasList(tkRes.data || []);
      setRombelList(rombelRes.data || []);
      
      const active = taRes.data?.find(ta => ta.is_active);
      if (active) setFilterTahunAjaran(active.id);
      else if (taRes.data?.length) setFilterTahunAjaran(taRes.data[0].id);
      
    } catch (err) {
      console.error('Error fetching filters:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTingkatKelasInfo = (tahunMasukId: string, contextTahunAjaranId: string) => {
    if (!tahunMasukId || !contextTahunAjaranId || tahunAjaranList.length === 0 || tingkatKelasList.length === 0) return null;
    
    const masukIndex = tahunAjaranList.findIndex(ta => ta.id === tahunMasukId);
    const activeIndex = tahunAjaranList.findIndex(ta => ta.id === contextTahunAjaranId);
    
    if (masukIndex === -1 || activeIndex === -1) return null;
    
    const uniqueYears = (Array.from(new Set(tahunAjaranList.map(ta => ta.nama))) as string[]).sort((a, b) => a.localeCompare(b));
    const masukTa = tahunAjaranList[masukIndex];
    const activeTa = tahunAjaranList[activeIndex];
    
    const masukYearIndex = uniqueYears.indexOf(masukTa.nama);
    const activeYearIndex = uniqueYears.indexOf(activeTa.nama);
    
    if (masukYearIndex === -1 || activeYearIndex === -1) return null;
    
    const diff = activeYearIndex - masukYearIndex;
    const currentUrutan = diff + 1;
    
    if (diff < 0) return { nama: 'Belum Masuk', urutan: currentUrutan, valid: false };
    
    const tingkat = tingkatKelasList.find(tk => tk.urutan === currentUrutan);
    if (!tingkat) return { nama: `Lulus`, urutan: currentUrutan, valid: false };
    
    return { ...tingkat, valid: true };
  };

  const filteredRombels = React.useMemo(() => {
    if (!filterTahunAjaran || !filterJurusan || !filterTingkatKelas) {
      return [];
    }
    return rombelList.filter(r => {
      if (filterJurusan && r.jurusan_id !== filterJurusan) return false;
      if (filterTingkatKelas) {
        const tkInfo = getTingkatKelasInfo(r.tahun_masuk_id, filterTahunAjaran);
        if (!tkInfo || tkInfo.id !== filterTingkatKelas) return false;
      }
      return true;
    });
  }, [rombelList, filterJurusan, filterTingkatKelas, filterTahunAjaran, tingkatKelasList]);

  const fetchJadwal = async () => {
    if (!selectedRombelId) return '';
    const dayOfWeek = new Date(selectedTanggal).getDay();
    try {
      const { data } = await supabase
        .from('jadwal_pelajaran')
        .select(`
          id,
          mata_pelajaran(nama),
          jam_mulai,
          jam_selesai
        `)
        .eq('rombongan_belajar_id', selectedRombelId)
        .eq('hari', dayOfWeek);
      
      if (data) {
        const formattedJadwals = data.map((j: any) => ({
          id: j.id,
          mata_pelajaran: j.mata_pelajaran,
          jam_mulai: j.jam_mulai,
          jam_selesai: j.jam_selesai
        }));
        setJadwals(formattedJadwals);
        if (formattedJadwals.length > 0) {
          setSelectedJadwalId(formattedJadwals[0].id);
          return formattedJadwals[0].id;
        } else {
          setSelectedJadwalId('');
          return '';
        }
      }
      return '';
    } catch (err) {
      console.error('Error fetching jadwals:', err);
      return '';
    }
  };

  const fetchSiswa = async (rombelId = selectedRombelId, jadwalId = selectedJadwalId, tanggal = selectedTanggal) => {
    if (!rombelId) {
      setSiswaList([]);
      return;
    }
    try {
      const { data: members } = await supabase
        .from('anggota_rombel')
        .select(`
          siswa(id, nis, nama_lengkap)
        `)
        .eq('rombongan_belajar_id', rombelId);
      
      if (members) {
        const list = members.map((item: any) => ({
          id: item.siswa.id,
          nis: item.siswa.nis,
          nama_lengkap: item.siswa.nama_lengkap,
          status: null,
          keterangan: ''
        }));

        // Fetch existing attendance for this specific schedule and date
        if (jadwalId && tanggal) {
          const { data: existing } = await supabase
            .from('absensi')
            .select('siswa_id, status, keterangan')
            .eq('jadwal_pelajaran_id', jadwalId)
            .eq('tanggal', tanggal);
          
          if (existing && existing.length > 0) {
            const mergedList = list.map(siswa => {
              const absensi = existing.find(a => a.siswa_id === siswa.id);
              return absensi ? { 
                ...siswa, 
                status: absensi.status, 
                keterangan: absensi.keterangan || '' 
              } : siswa;
            });
            setSiswaList(mergedList);
            return;
          }
        }
        
        setSiswaList(list);
      }
    } catch (err) {
      console.error('Error fetching siswa:', err);
    }
  };

  const handleStatusChange = (siswaId: string, status: 'hadir' | 'izin' | 'sakit' | 'alpa') => {
    setSiswaList(prev => prev.map(s => s.id === siswaId ? { ...s, status } : s));
  };

  const handleKeteranganChange = (siswaId: string, keterangan: string) => {
    setSiswaList(prev => prev.map(s => s.id === siswaId ? { ...s, keterangan } : s));
  };

  const handleHadirkanSemua = () => {
    setSiswaList(prev => prev.map(s => ({ ...s, status: 'hadir' })));
  };

  const handleSave = async () => {
    if (!selectedJadwalId) {
      setMessage({ type: 'error', text: 'Pilih jadwal pelajaran terlebih dahulu' });
      return;
    }

    const hasEmptyStatus = siswaList.some(s => !s.status);
    if (hasEmptyStatus) {
      setMessage({ type: 'error', text: 'Semua data absensi harus terisi' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const absensiData = siswaList.map(s => ({
        jadwal_pelajaran_id: selectedJadwalId,
        siswa_id: s.id,
        tanggal: selectedTanggal,
        status: s.status,
        keterangan: s.keterangan || '',
        dicatat_oleh: userId
      }));

    if (absensiData.length === 0) {
      setMessage({ type: 'error', text: 'Tidak ada data siswa untuk disimpan' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('absensi')
        .upsert(absensiData, { onConflict: 'jadwal_pelajaran_id, siswa_id, tanggal' });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Absensi berhasil disimpan' });
    } catch (err: any) {
      console.error('Error saving absensi:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan absensi' });
    } finally {
      setSaving(false);
    }
  };

  const filteredSiswa = siswaList.filter(s => 
    s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery)
  );

  const isAllFiltersSelected = Boolean(
    filterTahunAjaran && 
    filterJurusan && 
    filterTingkatKelas && 
    selectedRombelId && 
    selectedTanggal && 
    selectedJadwalId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Absensi Siswa</h1>
        <p className="text-slate-500 mt-1">Catat kehadiran siswa berdasarkan jadwal pelajaran</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran & Semester</label>
            <select 
              value={filterTahunAjaran}
              onChange={(e) => setFilterTahunAjaran(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
            >
              {tahunAjaranList.map(ta => (
                <option key={ta.id} value={ta.id}>{ta.nama} - {formatSemester(ta.semester)} {ta.is_active ? '(Aktif)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jurusan</label>
            <select 
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
            >
              <option value="">Pilih Jurusan</option>
              {jurusanList.map(j => (
                <option key={j.id} value={j.id}>{j.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat Kelas</label>
            <select 
              value={filterTingkatKelas}
              onChange={(e) => setFilterTingkatKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
            >
              <option value="">Pilih Tingkat</option>
              {tingkatKelasList.map(tk => (
                <option key={tk.id} value={tk.id}>{tk.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rombongan Belajar</label>
            <select 
              value={selectedRombelId}
              onChange={(e) => setSelectedRombelId(e.target.value)}
              disabled={!filterTahunAjaran || !filterJurusan || !filterTingkatKelas}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">{(!filterTahunAjaran || !filterJurusan || !filterTingkatKelas) ? 'Pilih filter sebelumnya' : 'Pilih Rombel'}</option>
              {filteredRombels.map(r => (
                <option key={r.id} value={r.id}>{r.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input 
              type="date" 
              max={getLocalDateString()}
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mata Pelajaran</label>
            <select 
              value={selectedJadwalId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedJadwalId(newId);
                fetchSiswa(selectedRombelId, newId, selectedTanggal);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
            >
              {jadwals.length > 0 ? (
                jadwals.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.mata_pelajaran.nama} ({j.jam_mulai.substring(0, 5)} - {j.jam_selesai.substring(0, 5)})
                  </option>
                ))
              ) : (
                <option value="">Tidak ada jadwal</option>
              )}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari nama siswa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleHadirkanSemua}
              disabled={!isAllFiltersSelected}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hadirkan Semua
            </button>
            <button 
              onClick={() => {
                const hasEmptyStatus = siswaList.some(s => !s.status);
                if (hasEmptyStatus) {
                  setMessage({ type: 'error', text: 'Semua data absensi harus terisi' });
                  return;
                }
                setShowConfirm(true);
              }}
              disabled={saving || !isAllFiltersSelected}
              className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Absensi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-sm text-green-600 font-medium">Hadir</p>
            <p className="text-2xl font-bold text-green-700">{siswaList.filter(s => s.status === 'hadir').length}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Izin</p>
            <p className="text-2xl font-bold text-blue-700">{siswaList.filter(s => s.status === 'izin').length}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-600 font-medium">Sakit</p>
            <p className="text-2xl font-bold text-amber-700">{siswaList.filter(s => s.status === 'sakit').length}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
            <p className="text-sm text-rose-600 font-medium">Alpa</p>
            <p className="text-2xl font-bold text-rose-700">{siswaList.filter(s => s.status === 'alpa').length}</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4 w-32">NIS</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4 text-center">Kehadiran</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!isAllFiltersSelected ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-8 h-8 text-slate-300 mb-3" />
                      <p>Silakan lengkapi semua filter di atas untuk menampilkan data siswa.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSiswa.length > 0 ? (
                filteredSiswa.map((siswa, index) => (
                  <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{siswa.nis}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{siswa.nama_lengkap}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(siswa.id, 'hadir')}
                          className={`p-2 rounded-full transition-colors ${siswa.status === 'hadir' ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:bg-slate-100'}`} 
                          title="Hadir"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(siswa.id, 'izin')}
                          className={`p-2 rounded-full transition-colors ${siswa.status === 'izin' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`} 
                          title="Izin"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(siswa.id, 'sakit')}
                          className={`p-2 rounded-full transition-colors ${siswa.status === 'sakit' ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`} 
                          title="Sakit"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(siswa.id, 'alpa')}
                          className={`p-2 rounded-full transition-colors ${siswa.status === 'alpa' ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`} 
                          title="Alpa"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={siswa.keterangan}
                        onChange={(e) => handleKeteranganChange(siswa.id, e.target.value)}
                        placeholder="Tambahkan catatan..." 
                        className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-sm outline-none focus:border-primary bg-transparent"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    Tidak ada data siswa di rombel ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Simpan</h3>
              <p className="text-slate-600 mb-6">Apakah Anda yakin ingin menyimpan data absensi ini?</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Batal</button>
                <button onClick={() => { setShowConfirm(false); handleSave(); }} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover shadow-sm">Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
