import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Calendar as CalendarIcon, List, Clock, Filter, Trash2, Edit2, X, UserCircle, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalPelajaran() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Relations
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [taList, setTaList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [ruangList, setRuangList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tingkatKelasList, setTingkatKelasList] = useState<any[]>([]);

  // Filters
  const [filterTa, setFilterTa] = useState<string>('');
  const [filterJurusan, setFilterJurusan] = useState<string>('');
  const [filterTingkat, setFilterTingkat] = useState<string>('');
  const [filterRombel, setFilterRombel] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('');
  const [filterGuru, setFilterGuru] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [formData, setFormData] = useState({
    tahun_ajaran_id: '',
    rombongan_belajar_id: '',
    mata_pelajaran_id: '',
    guru_id: '',
    ruang_kelas_id: '',
    tipe: 'rutin',
    hari: '1', // Senin
    tanggal: '',
    jam_mulai: '',
    jam_selesai: '',
    tanggal_mulai_efektif: '',
    tanggal_akhir_efektif: ''
  });

  const formatSemester = (sem: string) => {
    if (sem === 'Semester 1') return 'Ganjil';
    if (sem === 'Semester 2') return 'Genap';
    return sem;
  };

  useEffect(() => {
    fetchRelations();
  }, []);

  useEffect(() => {
    if (filterTa) {
      fetchData();
    }
  }, [filterTa, filterJurusan, filterTingkat, filterRombel, filterMapel, filterGuru]);

  const fetchRelations = async () => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL === undefined) {
        setLoading(false);
        return;
      }

      const [taRes, rombelRes, mapelRes, guruRes, ruangRes, jurusanRes, tkRes] = await Promise.all([
        supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: false }),
        supabase.from('rombongan_belajar').select('*, jurusan(nama)').order('nama'),
        supabase.from('mata_pelajaran').select('*').order('nama'),
        supabase.from('users').select('id, full_name, user_roles(role)').order('full_name'),
        supabase.from('ruang_kelas').select('*').order('nama'),
        supabase.from('jurusan').select('*').order('nama'),
        supabase.from('tingkat_kelas').select('*').order('urutan')
      ]);

      if (taRes.error) setFetchError('taRes error: ' + taRes.error.message);
      else if (rombelRes.error) setFetchError('rombelRes error: ' + rombelRes.error.message);
      else if (mapelRes.error) setFetchError('mapelRes error: ' + mapelRes.error.message);
      else if (guruRes.error) setFetchError('guruRes error: ' + guruRes.error.message);
      else if (ruangRes.error) setFetchError('ruangRes error: ' + ruangRes.error.message);
      else if (jurusanRes.error) setFetchError('jurusanRes error: ' + jurusanRes.error.message);
      else if (tkRes.error) setFetchError('tkRes error: ' + tkRes.error.message);

      console.log('taRes:', taRes);
      console.log('guruRes:', guruRes);

      setTaList(taRes.data || []);
      setRombelList(rombelRes.data || []);
      setMapelList(mapelRes.data || []);
      
      const guruData = guruRes.data?.filter(user => {
        if (!user.user_roles) return false;
        if (Array.isArray(user.user_roles)) {
          return user.user_roles.some((r: any) => ['guru', 'wali_kelas'].includes(r.role));
        }
        return ['guru', 'wali_kelas'].includes((user.user_roles as any).role);
      }) || [];
      setGuruList(guruData);
      
      setRuangList(ruangRes.data || []);
      setJurusanList(jurusanRes.data || []);
      setTingkatKelasList(tkRes.data || []);

      const active = taRes.data?.find(ta => ta.is_active);
      if (active) setFilterTa(active.id);
      else if (taRes.data && taRes.data.length > 0) setFilterTa(taRes.data[0].id);

    } catch (err) {
      console.error('Error fetching relations:', err);
    }
  };

  const getTingkatKelasInfo = (tahunMasukId: string, contextTahunAjaranId: string) => {
    if (!tahunMasukId || !contextTahunAjaranId || taList.length === 0 || tingkatKelasList.length === 0) return null;
    
    const masukTa = taList.find(ta => ta.id === tahunMasukId);
    const activeTa = taList.find(ta => ta.id === contextTahunAjaranId);
    
    if (!masukTa || !activeTa) return null;
    
    // Get unique years in chronological order (oldest first)
    const uniqueYears = (Array.from(new Set(taList.map(ta => ta.nama))) as string[]).sort((a, b) => {
      return a.localeCompare(b);
    });
    
    const masukYearIndex = uniqueYears.indexOf(masukTa.nama);
    const activeYearIndex = uniqueYears.indexOf(activeTa.nama);
    
    if (masukYearIndex === -1 || activeYearIndex === -1) return null;
    
    // Diff is how many years have passed since entry
    const diff = activeYearIndex - masukYearIndex;
    const currentUrutan = diff + 1;
    
    if (diff < 0) return { nama: 'Belum Masuk', urutan: currentUrutan, valid: false };
    
    const tingkat = tingkatKelasList.find(tk => tk.urutan === currentUrutan);
    if (!tingkat) return { nama: `Lulus`, urutan: currentUrutan, valid: false };
    
    return { ...tingkat, valid: true };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (import.meta.env.VITE_SUPABASE_URL === undefined) {
        setData([]);
        setLoading(false);
        return;
      }

      if (!filterTa) {
        setData([]);
        setLoading(false);
        return;
      }

      // Fetch schedules for the selected Tahun Ajaran
      const { data: result, error } = await supabase
        .from('jadwal_pelajaran')
        .select(`
          *,
          rombongan_belajar (
            id, 
            nama, 
            tahun_masuk_id, 
            jurusan_id
          ),
          mata_pelajaran (nama),
          guru:users!guru_id (full_name),
          ruang_kelas (nama)
        `)
        .eq('tahun_ajaran_id', filterTa)
        .order('hari', { ascending: true })
        .order('jam_mulai', { ascending: true });
      
      if (error) throw error;

      // Client-side filtering for Jurusan, Tingkat, Rombel
      const filteredResult = result?.filter(item => {
        const rombel = item.rombongan_belajar;
        
        // If rombel is missing, we still show it unless a rombel-specific filter is active
        if (!rombel) {
          return !filterJurusan && !filterTingkat && !filterRombel;
        }

        // Filter by Jurusan
        if (filterJurusan && rombel.jurusan_id !== filterJurusan) return false;

        // Filter by Tingkat
        if (filterTingkat) {
          const tkInfo = getTingkatKelasInfo(rombel.tahun_masuk_id, filterTa);
          if (!tkInfo || tkInfo.id !== filterTingkat) return false;
        }

        // Filter by Rombel
        if (filterRombel && rombel.id !== filterRombel) return false;

        // Filter by Mapel
        if (filterMapel && item.mata_pelajaran_id !== filterMapel) return false;

        // Filter by Guru
        if (filterGuru && item.guru_id !== filterGuru) return false;

        return true;
      }) || [];

      setData(filteredResult);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (import.meta.env.VITE_SUPABASE_URL === undefined) {
        setIsModalOpen(false);
        return;
      }

      const payload = {
        ...formData,
        hari: formData.tipe === 'rutin' ? parseInt(formData.hari) : null,
        tanggal: formData.tipe === 'sewaktu' ? formData.tanggal : null,
        tanggal_mulai_efektif: formData.tanggal_mulai_efektif || null,
        tanggal_akhir_efektif: formData.tanggal_akhir_efektif || null,
      };

      if (editingId) {
        const { error } = await supabase.from('jadwal_pelajaran').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jadwal_pelajaran').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan jadwal. Pastikan data sudah benar.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    try {
      await supabase.from('jadwal_pelajaran').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (item: any = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        tahun_ajaran_id: item.tahun_ajaran_id || filterTa,
        rombongan_belajar_id: item.rombongan_belajar_id,
        mata_pelajaran_id: item.mata_pelajaran_id,
        guru_id: item.guru_id,
        ruang_kelas_id: item.ruang_kelas_id,
        tipe: item.tipe,
        hari: item.hari?.toString() || '1',
        tanggal: item.tanggal || '',
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        tanggal_mulai_efektif: item.tanggal_mulai_efektif || '',
        tanggal_akhir_efektif: item.tanggal_akhir_efektif || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        tahun_ajaran_id: filterTa,
        rombongan_belajar_id: filterRombel || '',
        mata_pelajaran_id: '',
        guru_id: '',
        ruang_kelas_id: '',
        tipe: 'rutin',
        hari: '1',
        tanggal: '',
        jam_mulai: '',
        jam_selesai: '',
        tanggal_mulai_efektif: '',
        tanggal_akhir_efektif: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!filterTa) {
      alert('Pilih Tahun Ajaran terlebih dahulu sebelum mengimpor jadwal.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      try {
        setImportProgress({ current: 0, total: data.length });

        // Create lookup maps for faster processing
        const rombelMap = new Map(rombelList.map(r => [r.nama.toLowerCase(), r.id]));
        const mapelMap = new Map(mapelList.map(m => [m.nama.toLowerCase(), m.id]));
        const guruMap = new Map(guruList.map(g => [g.full_name.toLowerCase(), g.id]));
        const ruangMap = new Map(ruangList.map(r => [r.nama.toLowerCase(), r.id]));
        
        const hariMap = new Map([
          ['minggu', 0], ['senin', 1], ['selasa', 2], ['rabu', 3], ['kamis', 4], ['jumat', 5], ['sabtu', 6]
        ]);

        let successCount = 0;

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          
          const rombelId = rombelMap.get(String(row.Rombel || '').toLowerCase());
          const mapelId = mapelMap.get(String(row['Mata Pelajaran'] || '').toLowerCase());
          const guruId = guruMap.get(String(row.Guru || '').toLowerCase());
          const ruangId = ruangMap.get(String(row['Ruang Kelas'] || '').toLowerCase());
          
          const tipe = String(row.Tipe || 'rutin').toLowerCase();
          const hariStr = String(row.Hari || '').toLowerCase();
          const hari = hariMap.get(hariStr);
          
          if (rombelId && mapelId && guruId && ruangId) {
            const payload = {
              tahun_ajaran_id: filterTa,
              rombongan_belajar_id: rombelId,
              mata_pelajaran_id: mapelId,
              guru_id: guruId,
              ruang_kelas_id: ruangId,
              tipe: tipe === 'sewaktu' ? 'sewaktu' : 'rutin',
              hari: tipe === 'rutin' && hari !== undefined ? hari : null,
              tanggal: tipe === 'sewaktu' ? row.Tanggal : null,
              jam_mulai: row['Jam Mulai'] || '07:00',
              jam_selesai: row['Jam Selesai'] || '08:00',
              tanggal_mulai_efektif: row['Mulai Efektif'] || null,
              tanggal_akhir_efektif: row['Akhir Efektif'] || null
            };

            const { error } = await supabase.from('jadwal_pelajaran').insert([payload]);
            if (!error) successCount++;
          }
          
          setImportProgress({ current: i + 1, total: data.length });
        }

        alert(`Import selesai! Berhasil menambahkan ${successCount} dari ${data.length} jadwal.`);
        fetchData();
      } catch (err) {
        console.error('Error importing data:', err);
        alert('Terjadi kesalahan saat mengimpor data. Pastikan format file benar.');
      } finally {
        setImportProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredRombels = useMemo(() => {
    return rombelList.filter(r => {
      if (filterJurusan && r.jurusan_id !== filterJurusan) return false;
      if (filterTingkat) {
        const tkInfo = getTingkatKelasInfo(r.tahun_masuk_id, filterTa);
        if (!tkInfo || tkInfo.id !== filterTingkat) return false;
      }
      return true;
    });
  }, [rombelList, filterJurusan, filterTingkat, filterTa, taList, tingkatKelasList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jadwal Pelajaran</h1>
          <p className="text-slate-500 mt-1">Kelola jadwal pelajaran rutin dan sewaktu</p>
        </div>
        {fetchError && (
          <div className="bg-red-100 text-red-600 p-2 rounded-md">
            {fetchError}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white rounded-lg p-1 border border-slate-200 flex">
            <button 
              onClick={() => setView('list')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${view === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${view === 'calendar' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarIcon className="w-4 h-4" /> Kalender
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input id="import-file-input" type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
            <button 
              id="btn-download-sample"
              onClick={() => {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet([
                  { 
                    Rombel: 'X RPL 1', 
                    'Mata Pelajaran': 'Matematika', 
                    Guru: 'Budi Santoso', 
                    'Ruang Kelas': 'Ruang 101',
                    Tipe: 'rutin',
                    Hari: 'Senin',
                    Tanggal: '',
                    'Jam Mulai': '07:00',
                    'Jam Selesai': '08:30',
                    'Mulai Efektif': '2023-07-17',
                    'Akhir Efektif': '2023-12-15'
                  }
                ]);
                XLSX.utils.book_append_sheet(wb, ws, 'Jadwal');
                XLSX.writeFile(wb, 'Sampel_Import_Jadwal.xlsx');
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Sampel
            </button>
            <button 
              id="btn-import-excel"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tahun Ajaran & Semester</label>
              <select 
                value={filterTa}
                onChange={(e) => setFilterTa(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                {taList.map(ta => (
                  <option key={ta.id} value={ta.id}>{ta.nama} - {formatSemester(ta.semester)} {ta.is_active ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Jurusan</label>
              <select 
                value={filterJurusan}
                onChange={(e) => { setFilterJurusan(e.target.value); setFilterRombel(''); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                <option value="">Semua Jurusan</option>
                {jurusanList.map(j => (
                  <option key={j.id} value={j.id}>{j.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tingkat Kelas</label>
              <select 
                value={filterTingkat}
                onChange={(e) => { setFilterTingkat(e.target.value); setFilterRombel(''); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                <option value="">Semua Tingkat</option>
                {tingkatKelasList.map(tk => (
                  <option key={tk.id} value={tk.id}>{tk.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Rombongan Belajar</label>
              <select 
                value={filterRombel}
                onChange={(e) => setFilterRombel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                <option value="">Semua Rombel</option>
                {filteredRombels.map(r => (
                  <option key={r.id} value={r.id}>{r.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mata Pelajaran</label>
              <select 
                value={filterMapel}
                onChange={(e) => setFilterMapel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                <option value="">Semua Mapel</option>
                {mapelList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Guru</label>
              <select 
                value={filterGuru}
                onChange={(e) => setFilterGuru(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary"
              >
                <option value="">Semua Guru</option>
                {guruList.map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {view === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Jurusan</th>
                  <th className="px-6 py-4">Tingkat</th>
                  <th className="px-6 py-4">Rombel</th>
                  <th className="px-6 py-4">Ruang Kelas</th>
                  <th className="px-6 py-4">Guru</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={9} className="px-6 py-8 text-center">Memuat data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Belum ada jadwal untuk filter ini.</td></tr>
                ) : (
                  data.map((item) => {
                    const tkInfo = getTingkatKelasInfo(item.rombongan_belajar?.tahun_masuk_id, filterTa);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.mata_pelajaran?.nama}</td>
                        <td className="px-6 py-4">{jurusanList.find(j => j.id === item.rombongan_belajar?.jurusan_id)?.nama || '-'}</td>
                        <td className="px-6 py-4">{tkInfo?.nama || '-'}</td>
                        <td className="px-6 py-4">{item.rombongan_belajar?.nama}</td>
                        <td className="px-6 py-4">{item.ruang_kelas?.nama}</td>
                        <td className="px-6 py-4">{item.guru?.full_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>
                              {item.tipe === 'rutin' ? DAYS[item.hari] : item.tanggal}, {item.jam_mulai.substring(0, 5)} - {item.jam_selesai.substring(0, 5)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.tipe === 'rutin' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {item.tipe === 'rutin' ? 'Rutin' : 'Sewaktu'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 overflow-x-auto">
            <div className="grid grid-cols-6 gap-4 min-w-[1000px]">
              {DAYS.slice(1).map((day, idx) => {
                const dayIdx = idx + 1;
                const daySchedules = data.filter(item => item.tipe === 'rutin' && item.hari === dayIdx);
                
                return (
                  <div key={day} className="flex flex-col gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
                      <h4 className="font-bold text-slate-800">{day}</h4>
                    </div>
                    <div className="flex flex-col gap-3">
                      {daySchedules.length === 0 ? (
                        <div className="p-4 bg-slate-100/50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                          Tidak ada jadwal
                        </div>
                      ) : (
                        daySchedules.map(item => (
                          <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-primary transition-colors group relative">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                {item.jam_mulai.substring(0, 5)} - {item.jam_selesai.substring(0, 5)}
                              </span>
                              <div className="hidden group-hover:flex gap-1">
                                <button onClick={() => openModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <h5 className="text-sm font-bold text-slate-900 leading-tight mb-1">{item.mata_pelajaran?.nama}</h5>
                            <div className="space-y-1">
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <UserCircle className="w-3 h-3" /> {item.guru?.full_name}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold">K</div> {item.rombongan_belajar?.nama}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold">R</div> {item.ruang_kelas?.nama}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {data.some(item => item.tipe === 'sewaktu') && (
              <div className="mt-8">
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Jadwal Sewaktu / Khusus
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.filter(item => item.tipe === 'sewaktu').map(item => (
                    <div key={item.id} className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm hover:border-amber-400 transition-colors group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                          {item.tanggal} | {item.jam_mulai.substring(0, 5)} - {item.jam_selesai.substring(0, 5)}
                        </span>
                        <div className="hidden group-hover:flex gap-1">
                          <button onClick={() => openModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 mb-2">{item.mata_pelajaran?.nama}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-[11px] text-slate-600">Kelas: {item.rombongan_belajar?.nama}</p>
                        <p className="text-[11px] text-slate-600">Ruang: {item.ruang_kelas?.nama}</p>
                        <p className="text-[11px] text-slate-600 col-span-2">Guru: {item.guru?.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                  <select
                    required
                    value={formData.tahun_ajaran_id}
                    onChange={(e) => setFormData({ ...formData, tahun_ajaran_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {taList.map(ta => (
                      <option key={ta.id} value={ta.id}>{ta.nama} - {ta.semester}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rombongan Belajar</label>
                  <select
                    required
                    value={formData.rombongan_belajar_id}
                    onChange={(e) => setFormData({ ...formData, rombongan_belajar_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">Pilih Rombel</option>
                    {rombelList.map(r => (
                      <option key={r.id} value={r.id}>{r.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    required
                    value={formData.mata_pelajaran_id}
                    onChange={(e) => setFormData({ ...formData, mata_pelajaran_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">Pilih Mapel</option>
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guru</label>
                  <select
                    required
                    value={formData.guru_id}
                    onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">Pilih Guru</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ruang Kelas</label>
                  <select
                    required
                    value={formData.ruang_kelas_id}
                    onChange={(e) => setFormData({ ...formData, ruang_kelas_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">Pilih Ruang</option>
                    {ruangList.map(r => (
                      <option key={r.id} value={r.id}>{r.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Jadwal</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="rutin">Rutin</option>
                    <option value="sewaktu">Sewaktu</option>
                  </select>
                </div>
                {formData.tipe === 'rutin' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hari</label>
                    <select
                      value={formData.hari}
                      onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      {DAYS.map((day, idx) => (
                        <option key={idx} value={idx}>{day}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={formData.jam_mulai}
                    onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={formData.jam_selesai}
                    onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {formData.tipe === 'rutin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mulai Efektif</label>
                    <input
                      type="date"
                      value={formData.tanggal_mulai_efektif}
                      onChange={(e) => setFormData({ ...formData, tanggal_mulai_efektif: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Akhir Efektif</label>
                    <input
                      type="date"
                      value={formData.tanggal_akhir_efektif}
                      onChange={(e) => setFormData({ ...formData, tanggal_akhir_efektif: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 shrink-0">
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
      {importProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Mengimpor Data...</h3>
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}></div>
            </div>
            <p className="text-sm text-slate-600 text-center">Berhasil mengimpor {importProgress.current} dari {importProgress.total} data</p>
          </div>
        </div>
      )}
    </div>
  );
}
