import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function UserManagement() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    roles: [] as string[]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'error' | 'confirm'; onConfirm?: () => void } | null>(null);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const filteredData = data.filter(item => {
    const matchesSearch = item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roles = item.user_roles?.map((r: any) => r.role) || [];
    const matchesRole = roleFilter === 'all' || roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const checkAdminAndFetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUser } = await supabase.from('users').select('user_roles(role)').eq('id', user.id).single();
      const roles = currentUser?.user_roles?.map((r: any) => r.role) || [];
      
      if (roles.includes('admin')) {
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: result, error } = await supabase
        .from('users')
        .select('*, user_roles(role)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update user via RPC
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: editingId,
          new_email: formData.email,
          new_full_name: formData.full_name,
          new_roles: formData.roles,
          new_password: formData.password || null
        });
        if (error) throw error;
      } else {
        // Create user via RPC
        if (!formData.password) {
          alert('Password wajib diisi untuk user baru.');
          return;
        }
        const { error } = await supabase.rpc('admin_create_user', {
          p_email: formData.email,
          p_password: formData.password,
          p_full_name: formData.full_name,
          p_roles: formData.roles
        });
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
      setNotification({ title: 'Berhasil', message: 'Data pengguna berhasil disimpan', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setNotification({ title: 'Gagal', message: 'Gagal menyimpan pengguna: ' + err.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    setNotification({
      title: 'Konfirmasi',
      message: 'Apakah Anda yakin ingin menghapus pengguna ini secara permanen?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });
          if (error) throw error;
          fetchData();
          setNotification(null);
        } catch (err: any) {
          console.error(err);
          setNotification({ title: 'Gagal', message: 'Gagal menghapus pengguna: ' + err.message, type: 'error' });
        }
      }
    });
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        full_name: item.full_name,
        email: item.email,
        password: '',
        roles: item.user_roles?.map((r: any) => r.role) || []
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        roles: ['guru']
      });
    }
    setIsModalOpen(true);
  };

  if (!loading && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Akses Ditolak</h2>
          <p className="text-slate-500 mt-2">Halaman ini hanya dapat diakses oleh Administrator.</p>
        </div>
      </div>
    );
  }

  return (
      <div id="user-management-container" className="space-y-6">
      <div id="user-management-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="user-management-title" className="text-2xl font-bold text-slate-900">User Management</h1>
          <p id="user-management-subtitle" className="text-slate-500 mt-1">Kelola hak akses dan peran pengguna aplikasi</p>
        </div>
        <button
          id="btn-add-user"
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-800">Informasi Pengelolaan Pengguna</h4>
          <p className="text-sm text-amber-700 mt-1">
            Anda dapat menambah, mengubah, dan menghapus pengguna. Pastikan Anda telah menjalankan script SQL terbaru di Supabase agar fitur ini berfungsi.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari pengguna..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-slate-500 whitespace-nowrap">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="wali_kelas">Wali Kelas</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Peran (Role)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Tidak ada data</td></tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.full_name}</td>
                    <td className="px-6 py-4">{item.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.user_roles?.map((r: any) => (
                          <span key={r.role} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            r.role === 'admin' ? 'bg-red-100 text-red-700' :
                            r.role === 'wali_kelas' ? 'bg-purple-100 text-purple-700' : 
                            r.role === 'tenaga_kependidikan' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {r.role === 'admin' ? 'Admin' : 
                             r.role === 'wali_kelas' ? 'Wali Kelas' : 
                             r.role === 'tenaga_kependidikan' ? 'Tenaga Kependidikan' : 'Guru'}
                          </span>
                        ))}
                      </div>
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
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'Tambah'} Pengguna</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label htmlFor="user-name-input" className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  id="user-name-input"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="user-email-input" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  id="user-email-input"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="user-password-input" className="block text-sm font-medium text-slate-700 mb-1">
                  Password {editingId && <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>}
                </label>
                <input
                  id="user-password-input"
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Peran (Role)</label>
                <div className="space-y-2">
                  {['admin', 'wali_kelas', 'guru', 'tenaga_kependidikan'].map(role => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        id={`role-checkbox-${role}`}
                        type="checkbox"
                        checked={formData.roles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, roles: [...formData.roles, role] });
                          } else {
                            setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700 capitalize">{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button id="btn-cancel-user-modal" type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Batal
                </button>
                <button id="btn-save-user-modal" type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm">
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
    </div>
  );
}
