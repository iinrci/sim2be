import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Calendar, BookOpen, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

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

interface MataPelajaran {
  id: string;
  nama: string;
}

interface RekapData {
  id: string;
  tanggal: string;
  status: string;
  keterangan: string;
  siswa: {
    nis: string;
    nama_lengkap: string;
  };
  jadwal: {
    mata_pelajaran: {
      nama: string;
    };
    rombongan_belajar: {
      nama: string;
    };
  };
}

export default function RekapAbsensiSiswa() {
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tingkatKelasList, setTingkatKelasList] = useState<any[]>([]);
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [rekapList, setRekapList] = useState<RekapData[]>([]);
  
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterTingkatKelas, setFilterTingkatKelas] = useState('');
  const [selectedRombelId, setSelectedRombelId] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchRekap();
  }, [filterTahunAjaran, filterJurusan, filterTingkatKelas, selectedRombelId, selectedSubjectId, startDate, endDate]);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const [taRes, jurRes, tkRes, subjectRes, rombelRes] = await Promise.all([
        supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: false }),
        supabase.from('jurusan').select('*'),
        supabase.from('tingkat_kelas').select('*'),
        supabase.from('mata_pelajaran').select('id, nama').order('nama'),
        supabase.from('rombongan_belajar').select('id, nama, tahun_masuk_id, jurusan_id').order('nama')
      ]);

      setTahunAjaranList(taRes.data || []);
      setJurusanList(jurRes.data || []);
      setTingkatKelasList(tkRes.data || []);
      setSubjects(subjectRes.data || []);
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
    return rombelList.filter(r => {
      if (filterJurusan && r.jurusan_id !== filterJurusan) return false;
      if (filterTingkatKelas) {
        const tkInfo = getTingkatKelasInfo(r.tahun_masuk_id, filterTahunAjaran);
        if (!tkInfo || tkInfo.id !== filterTingkatKelas) return false;
      }
      return true;
    });
  }, [rombelList, filterJurusan, filterTingkatKelas, filterTahunAjaran, tingkatKelasList]);

  const fetchRekap = async () => {
    setFetching(true);
    try {
      let query = supabase
        .from('absensi')
        .select(`
          id,
          tanggal,
          status,
          keterangan,
          dicatat_oleh,
          siswa:siswa(nis, nama_lengkap),
          jadwal:jadwal_pelajaran(
            id,
            mata_pelajaran(nama),
            rombongan_belajar(id, nama, tahun_masuk_id, jurusan_id)
          ),
          petugas:users!dicatat_oleh(full_name)
        `)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Group by jadwal_pelajaran_id and tanggal
        const grouped = data.reduce((acc: any, item: any) => {
          const key = `${item.jadwal.id}_${item.tanggal}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              tanggal: item.tanggal,
              jadwal: item.jadwal,
              petugas: item.petugas?.full_name || '-',
              total: 0,
              hadir: 0,
              details: []
            };
          }
          acc[key].total += 1;
          if (item.status === 'hadir') {
            acc[key].hadir += 1;
          }
          acc[key].details.push({
            nis: item.siswa?.nis,
            nama: item.siswa?.nama_lengkap,
            status: item.status,
            keterangan: item.keterangan
          });
          return acc;
        }, {});
        
        let filteredData = Object.values(grouped);
        
        // Apply filters
        filteredData = filteredData.filter((item: any) => {
          const rombel = item.jadwal.rombongan_belajar;
          if (filterJurusan && rombel.jurusan_id !== filterJurusan) return false;
          if (selectedRombelId !== 'all' && rombel.id !== selectedRombelId) return false;
          if (filterTingkatKelas) {
            const tkInfo = getTingkatKelasInfo(rombel.tahun_masuk_id, filterTahunAjaran);
            if (!tkInfo || tkInfo.id !== filterTingkatKelas) return false;
          }
          return true;
        });

        setRekapList(filteredData as any[]);
      }
    } catch (err) {
      console.error('Error fetching rekap:', err);
    } finally {
      setFetching(false);
    }
  };

  const filteredRekap = rekapList.filter(item => 
    item.jadwal.mata_pelajaran.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.jadwal.rombongan_belajar.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-100 text-emerald-700';
      case 'izin': return 'bg-blue-100 text-blue-700';
      case 'sakit': return 'bg-amber-100 text-amber-700';
      case 'alpa': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekap Absensi Siswa</h1>
          <p className="text-slate-500 mt-1">Laporan riwayat kehadiran siswa</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          Cetak Laporan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tahun Ajaran</label>
              <select 
                value={filterTahunAjaran}
                onChange={(e) => setFilterTahunAjaran(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                {tahunAjaranList.map(ta => (
                  <option key={ta.id} value={ta.id}>{ta.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Jurusan</label>
              <select 
                value={filterJurusan}
                onChange={(e) => setFilterJurusan(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="">Semua Jurusan</option>
                {jurusanList.map(j => (
                  <option key={j.id} value={j.id}>{j.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tingkat Kelas</label>
              <select 
                value={filterTingkatKelas}
                onChange={(e) => setFilterTingkatKelas(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="">Semua Tingkat</option>
                {tingkatKelasList.map(tk => (
                  <option key={tk.id} value={tk.id}>{tk.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rombongan Belajar</label>
              <select 
                value={selectedRombelId}
                onChange={(e) => setSelectedRombelId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="all">Semua Rombel</option>
                {filteredRombels.map(r => (
                  <option key={r.id} value={r.id}>{r.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Akhir</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Cari kelas atau mapel..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
              />
            </div>
            <div className="text-sm text-slate-500">
              Menampilkan <span className="font-semibold text-slate-900">{filteredRekap.length}</span> data
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tanggal Absensi</th>
                  <th className="px-6 py-4">Tingkat Kelas & Rombel</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-center">Summary Absensi</th>
                  <th className="px-6 py-4">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                      <p className="mt-2 text-slate-400">Memuat data...</p>
                    </td>
                  </tr>
                ) : filteredRekap.length > 0 ? (
                  filteredRekap.map((item: any) => {
                    const tkInfo = getTingkatKelasInfo(item.jadwal.rombongan_belajar.tahun_masuk_id, filterTahunAjaran);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">{new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        <td className="px-6 py-4">{tkInfo?.nama || '-'} {item.jadwal.rombongan_belajar.nama}</td>
                        <td className="px-6 py-4">{item.jadwal.mata_pelajaran.nama}</td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => setSelectedDetail(item)}
                            className={clsx(
                              "px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105",
                              item.hadir === item.total ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {item.hadir}/{item.total}
                          </button>
                        </td>
                        <td className="px-6 py-4">{item.petugas}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      Tidak ada data absensi yang ditemukan untuk filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detail Absensi</h3>
                <p className="text-xs text-slate-500">
                  {selectedDetail.jadwal.rombongan_belajar.nama} • {selectedDetail.jadwal.mata_pelajaran.nama} • {new Date(selectedDetail.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-slate-400 rotate-45" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">Hadir</p>
                  <p className="text-xl font-black text-emerald-700">{selectedDetail.details.filter((d: any) => d.status === 'hadir').length}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Izin</p>
                  <p className="text-xl font-black text-blue-700">{selectedDetail.details.filter((d: any) => d.status === 'izin').length}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-amber-600">Sakit</p>
                  <p className="text-xl font-black text-amber-700">{selectedDetail.details.filter((d: any) => d.status === 'sakit').length}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-rose-600">Alpa</p>
                  <p className="text-xl font-black text-rose-700">{selectedDetail.details.filter((d: any) => d.status === 'alpa').length}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-2">Siswa</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedDetail.details.sort((a: any, b: any) => a.nama.localeCompare(b.nama)).map((d: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{d.nama}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{d.nis}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            getStatusColor(d.status)
                          )}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs italic">
                          {d.keterangan || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedDetail(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
