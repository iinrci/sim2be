import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export default function DataSiswa() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    nis: '',
    nama_lengkap: '',
    jenis_kelamin: 'L',
    rombel_id: ''
  });
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'error' | 'confirm'; onConfirm?: () => void } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    fetchData();
    fetchRombelList();
  }, []);

  const fetchRombelList = async () => {
    try {
      const { data } = await supabase.from('rombongan_belajar').select('id, nama').order('nama');
      setRombelList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('siswa')
        .select(`
          *,
          anggota_rombel (
            rombongan_belajar (id, nama)
          )
        `)
        .order('nama_lengkap', { ascending: true });
        
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
        nis: formData.nis,
        nama_lengkap: formData.nama_lengkap,
        jenis_kelamin: formData.jenis_kelamin
      };

      let studentId = editingId;

      if (editingId) {
        await supabase.from('siswa').update(payload).eq('id', editingId);
      } else {
        const { data: newStudent } = await supabase.from('siswa').insert([payload]).select().single();
        if (newStudent) studentId = newStudent.id;
      }

      // Handle Rombel Assignment
      if (studentId) {
        if (formData.rombel_id) {
          // Check if already in this rombel
          const { data: existing } = await supabase.from('anggota_rombel')
            .select('id')
            .eq('siswa_id', studentId)
            .eq('rombongan_belajar_id', formData.rombel_id);
            
          if (!existing || existing.length === 0) {
            // Delete old rombel assignments for simplicity (assuming 1 student = 1 active rombel)
            await supabase.from('anggota_rombel').delete().eq('siswa_id', studentId);
            await supabase.from('anggota_rombel').insert({ 
              siswa_id: studentId, 
              rombongan_belajar_id: formData.rombel_id 
            });
          }
        } else {
          // If no rombel selected, remove from all rombels
          await supabase.from('anggota_rombel').delete().eq('siswa_id', studentId);
        }
      }

      setIsModalOpen(false);
      fetchData();
      setNotification({ title: 'Berhasil', message: 'Data siswa berhasil disimpan', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ title: 'Gagal', message: 'Gagal menyimpan data. Pastikan NIS unik.', type: 'error' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      try {
        // Fetch all rombel for mapping
        const { data: rombelData } = await supabase.from('rombongan_belajar').select('id, nama');
        const rombelMap = new Map((rombelData || []).map(r => [r.nama.toLowerCase(), r.id]));
        
        setImportProgress({ current: 0, total: data.length });

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          const { data: newStudent } = await supabase.from('siswa').insert([{
            nis: row.NIS,
            nama_lengkap: row.Nama,
            jenis_kelamin: row.JK
          }]).select().single();
          
          if (newStudent && row.Rombel) {
            const rombelId = rombelMap.get(String(row.Rombel).toLowerCase());
            if (rombelId) {
              await supabase.from('anggota_rombel').insert({
                siswa_id: newStudent.id,
                rombongan_belajar_id: rombelId
              });
            }
          }
          setImportProgress({ current: i + 1, total: data.length });
        }
        fetchData();
        setImportProgress(null);
        setNotification({ title: 'Berhasil', message: `Berhasil mengimpor ${data.length} data siswa`, type: 'success' });
      } catch (err) {
        console.error(err);
        setImportProgress(null);
        setNotification({ title: 'Gagal', message: 'Gagal mengimpor data', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    setNotification({
      title: 'Konfirmasi',
      message: 'Apakah Anda yakin ingin menghapus data ini?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await supabase.from('siswa').delete().eq('id', id);
          fetchData();
          setNotification(null);
        } catch (err) {
          console.error(err);
          setNotification({ title: 'Gagal', message: 'Gagal menghapus data', type: 'error' });
        }
      }
    });
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nis: item.nis || '',
        nama_lengkap: item.nama_lengkap || '',
        jenis_kelamin: item.jenis_kelamin || 'L',
        rombel_id: item.anggota_rombel?.[0]?.rombongan_belajar?.id || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nis: '',
        nama_lengkap: '',
        jenis_kelamin: 'L',
        rombel_id: ''
      });
    }
    setIsModalOpen(true);
  };

  return (
      <div id="data-siswa-container" className="space-y-6">
      <div id="data-siswa-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="data-siswa-title" className="text-2xl font-bold text-slate-900">Data Siswa</h1>
          <p id="data-siswa-subtitle" className="text-slate-500 mt-1">Kelola data induk siswa</p>
        </div>
        <button
          id="btn-add-siswa"
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Siswa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari siswa..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            />
          </div>
          <div id="data-siswa-import-actions" className="flex flex-wrap items-center gap-2">
            <input id="import-file-input" type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
            <button 
              id="btn-download-sample"
              onClick={() => {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet([{ NIS: '12345', Nama: 'Budi Santoso', JK: 'L', Rombel: 'Nama Rombel' }]);
                XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
                XLSX.writeFile(wb, 'Sampel_Import_Siswa.xlsx');
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
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">L/P</th>
                <th className="px-6 py-4">Rombel</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Tidak ada data</td></tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nis}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nama_lengkap}</td>
                    <td className="px-6 py-4">{item.jenis_kelamin}</td>
                    <td className="px-6 py-4">
                      {item.anggota_rombel && item.anggota_rombel.length > 0 
                        ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {item.anggota_rombel[0].rombongan_belajar?.nama}
                          </span>
                        : <span className="text-slate-400 text-sm italic">Belum ada</span>
                      }
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
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'Tambah'} Siswa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="nis-input" className="block text-sm font-medium text-slate-700 mb-1">NIS</label>
                  <input
                    id="nis-input"
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="nama-input" className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    id="nama-input"
                    type="text"
                    required
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="jk-select" className="block text-sm font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    id="jk-select"
                    required
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rombel-select" className="block text-sm font-medium text-slate-700 mb-1">Rombongan Belajar</label>
                  <select
                    id="rombel-select"
                    value={formData.rombel_id}
                    onChange={(e) => setFormData({ ...formData, rombel_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">-- Belum Masuk Rombel --</option>
                    {rombelList.map(r => (
                      <option key={r.id} value={r.id}>{r.nama}</option>
                    ))}
                  </select>
                </div>
              </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button id="btn-cancel-modal" type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Batal
                </button>
                <button id="btn-save-modal" type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{notification.title}</h3>
            <p className="text-slate-600 mb-6">{notification.message}</p>
            <div className="flex justify-end gap-3">
              {notification.type === 'confirm' ? (
                <>
                  <button onClick={() => setNotification(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Batal</button>
                  <button onClick={notification.onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Hapus</button>
                </>
              ) : (
                <button onClick={() => setNotification(null)} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors">OK</button>
              )}
            </div>
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


