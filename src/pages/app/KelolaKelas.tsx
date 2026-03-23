import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Users, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function KelolaKelas() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tingkatKelasList, setTingkatKelasList] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  
  const [filterTahunAjaran, setFilterTahunAjaran] = useState<string>('');
  const [filterJurusan, setFilterJurusan] = useState<string>('');
  const [filterTingkatKelas, setFilterTingkatKelas] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRombel, setSelectedRombel] = useState<any>(null);
  const [selectedGuru, setSelectedGuru] = useState<string>('');

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedRombelForStudents, setSelectedRombelForStudents] = useState<any>(null);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const formatSemester = (sem: string) => {
    if (sem === 'Semester 1') return 'Semester Ganjil';
    if (sem === 'Semester 2') return 'Semester Genap';
    return sem;
  };

  useEffect(() => {
    fetchRelations();
  }, []);

  const fetchRelations = async () => {
    try {
      const [jurusanRes, taRes, tkRes, guruRes] = await Promise.all([
        supabase.from('jurusan').select('id, nama'),
        supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: true }),
        supabase.from('tingkat_kelas').select('*').order('urutan', { ascending: true }),
        supabase.from('users').select('id, full_name, user_roles(role)')
      ]);
      
      setJurusanList(jurusanRes.data || []);
      const taData = taRes.data || [];
      setTahunAjaranList(taData);
      setTingkatKelasList(tkRes.data || []);
      
      const guruData = guruRes.data?.filter(user => 
        user.user_roles && Array.isArray(user.user_roles) && user.user_roles.some((r: any) => ['guru', 'wali_kelas'].includes(r.role))
      ) || [];
      setGuruList(guruData);
      
      const active = taData.find(ta => ta.is_active);
      if (active) {
        setFilterTahunAjaran(active.id);
      } else if (taData.length > 0) {
        setFilterTahunAjaran(taData[taData.length - 1].id);
      }
      
      fetchData();
    } catch (err) {
      console.error('Error fetching relations:', err);
      setLoading(false);
    }
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
          anggota_rombel (count),
          wali_kelas:users!wali_kelas_id (full_name)
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

  const getTingkatKelasInfo = (tahunMasukId: string, contextTahunAjaranId: string) => {
    if (!tahunMasukId || !contextTahunAjaranId || tahunAjaranList.length === 0 || tingkatKelasList.length === 0) return null;
    
    const masukIndex = tahunAjaranList.findIndex(ta => ta.id === tahunMasukId);
    const activeIndex = tahunAjaranList.findIndex(ta => ta.id === contextTahunAjaranId);
    
    if (masukIndex === -1 || activeIndex === -1) return null;
    
    const uniqueYears = Array.from(new Set(tahunAjaranList.map(ta => ta.nama)));
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

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Calculate Tingkat Kelas relative to filterTahunAjaran
      const tkInfo = getTingkatKelasInfo(item.tahun_masuk_id, filterTahunAjaran);
      
      // Only show valid classes (not graduated, not future)
      if (!tkInfo || !tkInfo.valid) return false;
      
      // 2. Filter by Jurusan
      if (filterJurusan && item.jurusan_id !== filterJurusan) return false;
      
      // 3. Filter by Tingkat Kelas
      if (filterTingkatKelas && tkInfo.id !== filterTingkatKelas) return false;
      
      return true;
    }).map(item => ({
      ...item,
      tingkat_kelas_info: getTingkatKelasInfo(item.tahun_masuk_id, filterTahunAjaran)
    }));
  }, [data, filterTahunAjaran, filterJurusan, filterTingkatKelas, tahunAjaranList, tingkatKelasList]);

  const openAssignModal = (rombel: any) => {
    setSelectedRombel(rombel);
    setSelectedGuru(rombel.wali_kelas_id || '');
    setIsModalOpen(true);
  };

  const handleAssignWaliKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRombel) return;
    
    try {
      await supabase
        .from('rombongan_belajar')
        .update({ wali_kelas_id: selectedGuru || null })
        .eq('id', selectedRombel.id);
        
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const openStudentModal = async (rombel: any) => {
    setSelectedRombelForStudents(rombel);
    setIsStudentModalOpen(true);
    setLoadingStudents(true);
    setStudentList([]);
    
    try {
      const { data, error } = await supabase
        .from('anggota_rombel')
        .select(`
          siswa (
            id,
            nis,
            nisn,
            nama_lengkap,
            jenis_kelamin
          )
        `)
        .eq('rombongan_belajar_id', rombel.id);
        
      if (error) throw error;
      
      // Extract siswa data from the join
      const students = data?.map(item => item.siswa).filter(Boolean) || [];
      // Sort by name
      students.sort((a: any, b: any) => a.nama_lengkap.localeCompare(b.nama_lengkap));
      
      setStudentList(students);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Kelas</h1>
          <p className="text-slate-500 mt-1">Daftar kelas dan penugasan wali kelas</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tahun Ajaran</label>
              <select
                value={filterTahunAjaran}
                onChange={(e) => setFilterTahunAjaran(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              >
                {tahunAjaranList.map(ta => (
                  <option key={ta.id} value={ta.id}>{ta.nama} - {formatSemester(ta.semester)} {ta.is_active ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Jurusan</label>
              <select
                value={filterJurusan}
                onChange={(e) => setFilterJurusan(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
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
                value={filterTingkatKelas}
                onChange={(e) => setFilterTingkatKelas(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              >
                <option value="">Semua Tingkat</option>
                {tingkatKelasList.map(tk => (
                  <option key={tk.id} value={tk.id}>{tk.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tahun Ajaran</th>
                <th className="px-6 py-4">Jurusan</th>
                <th className="px-6 py-4">Tingkat Kelas</th>
                <th className="px-6 py-4">Nama Rombel</th>
                <th className="px-6 py-4 text-center">Jumlah Siswa</th>
                <th className="px-6 py-4">Wali Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Tidak ada kelas yang sesuai dengan filter</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{item.tahun_masuk ? `${item.tahun_masuk.nama} - ${formatSemester(item.tahun_masuk.semester)}` : '-'}</td>
                    <td className="px-6 py-4">{item.jurusan?.nama || '-'}</td>
                    <td className="px-6 py-4 font-medium text-primary">{item.tingkat_kelas_info?.nama || '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nama}</td>
                    <td className="px-6 py-4 text-center font-medium">
                      <button 
                        onClick={() => openStudentModal(item)}
                        className="text-primary hover:text-primary-hover hover:underline focus:outline-none"
                      >
                        {item.anggota_rombel?.[0]?.count || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {item.wali_kelas ? (
                        <div className="flex items-center justify-between group">
                          <span className="font-medium text-slate-700">{item.wali_kelas.full_name}</span>
                          <button 
                            onClick={() => openAssignModal(item)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Ubah Wali Kelas"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => openAssignModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Wali Kelas
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedRombel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Set Wali Kelas</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleAssignWaliKelas} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Pilih wali kelas untuk rombongan belajar <span className="font-bold text-slate-900">{selectedRombel.nama}</span>.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guru / Wali Kelas</label>
                <select
                  value={selectedGuru}
                  onChange={(e) => setSelectedGuru(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="">-- Kosongkan Wali Kelas --</option>
                  {guruList.map(g => (
                    <option key={g.id} value={g.id}>{g.full_name} ({g.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru'})</option>
                  ))}
                </select>
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

      {isStudentModalOpen && selectedRombelForStudents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daftar Siswa</h3>
                <p className="text-sm text-slate-500">Kelas: {selectedRombelForStudents.nama}</p>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingStudents ? (
                <div className="text-center py-8 text-slate-500">Memuat data siswa...</div>
              ) : studentList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Belum ada siswa di kelas ini.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">No</th>
                        <th className="px-4 py-3">NIS</th>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3 text-center">L/P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {studentList.map((siswa, idx) => (
                        <tr key={siswa.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-center">{idx + 1}</td>
                          <td className="px-4 py-3">{siswa.nis || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{siswa.nama_lengkap}</td>
                          <td className="px-4 py-3 text-center">{siswa.jenis_kelamin || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
              <button 
                onClick={() => setIsStudentModalOpen(false)} 
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
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
