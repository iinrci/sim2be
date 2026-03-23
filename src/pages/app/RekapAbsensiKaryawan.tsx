import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Calendar, Users, FileText, Filter, ShieldAlert, Edit2, Trash2, X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RekapAbsensiKaryawan() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString());

  // Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    user_id: '',
    tanggal: getLocalDateString(),
    waktu_masuk: '',
    waktu_pulang: '',
    status: 'hadir'
  });

  // Delete Confirmation Modal
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Notification Modal
  const [notification, setNotification] = useState<{title: string, message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchReportData();
      fetchUsers();
    }
  }, [startDate, endDate, isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, user_roles(role)')
        .order('full_name');
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('user_roles(role)')
        .eq('id', user.id)
        .single();

      const roles = userData?.user_roles?.map((r: any) => r.role) || [];
      setIsAdmin(roles.includes('admin'));
    } catch (err) {
      console.error('Error checking access:', err);
      setIsAdmin(false);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('absensi_karyawan')
        .select(`
          *,
          user:users(full_name, user_roles(role))
        `)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: false })
        .order('waktu_masuk', { ascending: false });
        
      const { data, error } = await query;
        
      if (error) throw error;
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      const { error } = await supabase
        .from('absensi_karyawan')
        .update({
          waktu_masuk: editingRecord.waktu_masuk || null,
          waktu_pulang: editingRecord.waktu_pulang || null,
          status: editingRecord.status
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      setIsModalOpen(false);
      fetchReportData();
    } catch (err: any) {
      console.error(err);
      setNotification({
        title: 'Gagal',
        message: 'Gagal menyimpan perubahan: ' + err.message,
        type: 'error'
      });
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.user_id) {
      setNotification({
        title: 'Peringatan',
        message: 'Silakan pilih karyawan terlebih dahulu',
        type: 'error'
      });
      return;
    }
    
    try {
      // Cek apakah data absensi sudah ada untuk user dan tanggal tersebut
      const { data: existingRecord, error: checkError } = await supabase
        .from('absensi_karyawan')
        .select('id')
        .eq('user_id', newRecord.user_id)
        .eq('tanggal', newRecord.tanggal)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRecord) {
        setNotification({
          title: 'Gagal Menambah',
          message: 'Data absensi untuk karyawan ini pada tanggal tersebut sudah ada.',
          type: 'error'
        });
        return;
      }

      const { error } = await supabase
        .from('absensi_karyawan')
        .insert([{
          user_id: newRecord.user_id,
          tanggal: newRecord.tanggal,
          waktu_masuk: newRecord.waktu_masuk || null,
          waktu_pulang: newRecord.waktu_pulang || null,
          status: newRecord.status
        }]);

      if (error) throw error;
      setIsAddModalOpen(false);
      setNewRecord({
        user_id: '',
        tanggal: getLocalDateString(),
        waktu_masuk: '',
        waktu_pulang: '',
        status: 'hadir'
      });
      fetchReportData();
    } catch (err: any) {
      console.error(err);
      setNotification({
        title: 'Gagal',
        message: 'Gagal menambah data: ' + err.message,
        type: 'error'
      });
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      const { error } = await supabase
        .from('absensi_karyawan')
        .delete()
        .eq('id', recordToDelete);

      if (error) throw error;
      setRecordToDelete(null);
      fetchReportData();
    } catch (err: any) {
      console.error(err);
      setNotification({
        title: 'Gagal',
        message: 'Gagal menghapus data: ' + err.message,
        type: 'error'
      });
      setRecordToDelete(null);
    }
  };

  const formatRole = (roles: any[]) => {
    if (!roles || roles.length === 0) return 'Guru';
    const roleNames = roles.map(r => r.role);
    if (roleNames.includes('admin')) return 'Admin';
    if (roleNames.includes('wali_kelas')) return 'Wali Kelas';
    if (roleNames.includes('tenaga_kependidikan')) return 'Tenaga Kependidikan';
    return 'Guru';
  };

  const filteredData = reportData.filter(item => {
    let nameMatch = true;
    if (nameFilter !== 'all') {
      nameMatch = item.user_id === nameFilter;
    }
    
    let roleMatch = true;
    if (roleFilter !== 'all') {
      const roles = item.user?.user_roles?.map((r: any) => r.role) || [];
      if (roles.length === 0 && roleFilter === 'guru') {
        roleMatch = true;
      } else {
        roleMatch = roles.includes(roleFilter);
      }
    }

    return nameMatch && roleMatch;
  });

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-md">
          Halaman ini hanya dapat diakses oleh Administrator. Anda tidak memiliki izin untuk melihat rekap absensi karyawan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekap Absensi Karyawan</h1>
          <p className="text-slate-500 mt-1">Laporan kehadiran staf dan guru</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Absensi
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Tanggal Mulai
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Tanggal Akhir
              </label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Filter className="w-3 h-3" /> Filter Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="all">Semua Role</option>
                <option value="admin">Admin</option>
                <option value="guru">Guru</option>
                <option value="wali_kelas">Wali Kelas</option>
                <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" /> Nama Karyawan
              </label>
              <select
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="all">Semua Karyawan</option>
                {usersList.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-end mb-6 gap-4">
            <div className="text-sm text-slate-500 shrink-0">
              Menampilkan <span className="font-semibold text-slate-900">{filteredData.length}</span> data
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Nama Karyawan</th>
                  <th className="px-6 py-4">Peran</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Waktu Masuk</th>
                  <th className="px-6 py-4">Waktu Pulang</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                      <p className="mt-2 text-slate-400">Memuat data...</p>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.user?.full_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {item.user ? formatRole(item.user.user_roles) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{item.tanggal}</td>
                      <td className="px-6 py-4 font-mono text-emerald-600">{item.waktu_masuk?.substring(0, 5) || '-'}</td>
                      <td className="px-6 py-4 font-mono text-amber-600">{item.waktu_pulang?.substring(0, 5) || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.status === 'hadir' ? 'bg-green-100 text-green-700' : 
                          item.status === 'izin' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'sakit' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingRecord(item);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Absensi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setRecordToDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Absensi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                      Tidak ada data absensi yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Absensi</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Karyawan</label>
                <input
                  type="text"
                  disabled
                  value={editingRecord.user?.full_name || ''}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  disabled
                  value={editingRecord.tanggal}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Masuk</label>
                  <input
                    type="time"
                    step="1"
                    value={editingRecord.waktu_masuk || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, waktu_masuk: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Pulang</label>
                  <input
                    type="time"
                    step="1"
                    value={editingRecord.waktu_pulang || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, waktu_pulang: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpa">Alpa</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tambah Absensi Manual</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Karyawan</label>
                <select
                  required
                  value={newRecord.user_id}
                  onChange={(e) => setNewRecord({...newRecord, user_id: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {usersList.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={newRecord.tanggal}
                  onChange={(e) => setNewRecord({...newRecord, tanggal: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Masuk</label>
                  <input
                    type="time"
                    step="1"
                    value={newRecord.waktu_masuk}
                    onChange={(e) => setNewRecord({...newRecord, waktu_masuk: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Pulang</label>
                  <input
                    type="time"
                    step="1"
                    value={newRecord.waktu_pulang}
                    onChange={(e) => setNewRecord({...newRecord, waktu_pulang: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={newRecord.status}
                  onChange={(e) => setNewRecord({...newRecord, status: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpa">Alpa</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Data Absensi?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus data absensi ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${notification.type === 'error' ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                {notification.type === 'error' ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{notification.title}</h3>
              <p className="text-slate-500 text-sm mb-6">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
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
