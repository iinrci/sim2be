import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  title: string;
  table: string;
  columns: string[];
}

export default function GenericMasterData({ title, table, columns }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [table]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderColumn = table === 'tingkat_kelas' ? 'urutan' : 'created_at';
      const orderAscending = table === 'tingkat_kelas' ? true : false;
      const { data: result, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: orderAscending });
      
      if (error) {
        if (error.message.includes('schema cache') || error.message.includes('not found')) {
          setError('Tabel database belum dibuat. Silakan jalankan script SQL dari file sql.txt di Supabase.');
        } else {
          setError(error.message);
        }
        return;
      }
      
      setData(result || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat mengambil data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase.from(table).update(formData).eq('id', editingId);
      } else {
        await supabase.from(table).insert([formData]);
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
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data {title}</h1>
          <p className="text-slate-500 mt-1">Kelola data master {title.toLowerCase()}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Data
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari data..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                {table !== 'tingkat_kelas' && <th className="px-6 py-4">No</th>}
                {columns.map(col => (
                  <th key={col} className="px-6 py-4 capitalize">{col.replace('_', ' ')}</th>
                ))}
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={columns.length + (table === 'tingkat_kelas' ? 1 : 2)} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + (table === 'tingkat_kelas' ? 1 : 2)} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <p className="font-medium">{error}</p>
                      <button 
                        onClick={() => fetchData()}
                        className="mt-2 text-sm underline hover:text-red-600"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + (table === 'tingkat_kelas' ? 1 : 2)} className="px-6 py-8 text-center">Tidak ada data</td></tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {table !== 'tingkat_kelas' && <td className="px-6 py-4">{index + 1}</td>}
                    {columns.map(col => (
                      <td key={col} className="px-6 py-4 font-medium text-slate-900">{item[col]}</td>
                    ))}
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
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'Tambah'} {title}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {columns.map(col => (
                <div key={col}>
                  <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{col.replace('_', ' ')}</label>
                  <input
                    type={col === 'urutan' ? 'number' : 'text'}
                    required
                    value={formData[col] || ''}
                    onChange={(e) => setFormData({ ...formData, [col]: col === 'urutan' ? parseInt(e.target.value) || '' : e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              ))}
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
    </div>
  );
}
