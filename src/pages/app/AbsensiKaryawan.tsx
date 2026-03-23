import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, LogOut, Search, FileText, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AbsensiKaryawan() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');

  // Notification Modal
  const [notification, setNotification] = useState<{title: string, message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkUserAndFetchData();
  }, [startDate, endDate]);

  const checkUserAndFetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase.from('users').select('*, user_roles(role)').eq('id', user.id).single();
      setCurrentUser(userData);
      
      const roles = userData?.user_roles?.map((r: any) => r.role) || [];
      const isAdminUser = roles.includes('admin');
      setIsAdmin(isAdminUser);

      fetchTodayRecord(user.id);
      fetchReportData(user.id, isAdminUser);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayRecord = async (userId: string) => {
    try {
      const today = getLocalDateString();
      const { data, error } = await supabase
        .from('absensi_karyawan')
        .select('*')
        .eq('user_id', userId)
        .eq('tanggal', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setTodayRecord(data || null);
    } catch (err) {
      console.error('Error fetching today record:', err);
    }
  };

  const fetchReportData = async (userId: string, isAdminUser: boolean) => {
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
        
      if (!isAdminUser) {
        query = query.eq('user_id', userId);
      }
        
      const { data, error } = await query;
      if (error) throw error;
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching report:', err);
    }
  };

  const handleCheckIn = async (status: 'hadir' | 'izin' | 'sakit' = 'hadir') => {
    if (!currentUser) return;
    try {
      const today = getLocalDateString();
      const time = status === 'hadir' ? new Date().toLocaleTimeString('en-GB') : null;

      const { data, error } = await supabase.from('absensi_karyawan').insert([{
        user_id: currentUser.id,
        tanggal: today,
        waktu_masuk: time,
        waktu_pulang: null,
        status: status
      }]).select().single();

      if (error) throw error;
      setTodayRecord(data);
      fetchReportData(currentUser.id, isAdmin);
    } catch (err: any) {
      console.error(err);
      setNotification({
        title: 'Gagal',
        message: `Gagal melakukan absen ${status}: ` + err.message,
        type: 'error'
      });
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    try {
      const time = new Date().toLocaleTimeString('en-GB');

      const { data, error } = await supabase
        .from('absensi_karyawan')
        .update({ waktu_pulang: time })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;
      setTodayRecord(data);
      fetchReportData(currentUser.id, isAdmin);
    } catch (err: any) {
      console.error(err);
      setNotification({
        title: 'Gagal',
        message: 'Gagal melakukan absen pulang: ' + err.message,
        type: 'error'
      });
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

  const filteredReportData = reportData.filter(item => {
    if (!searchTerm) return true;
    const name = item.user?.full_name?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Absensi Karyawan</h1>
        <p className="text-slate-500 mt-1">Absensi mandiri untuk seluruh staf dan guru</p>
      </div>

      {/* Self Attendance Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h2>
              <p className="text-slate-500">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {!todayRecord ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button 
                  onClick={() => handleCheckIn('hadir')}
                  disabled={loading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Absen Masuk
                </button>
                <button 
                  onClick={() => handleCheckIn('izin')}
                  disabled={loading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  Izin
                </button>
                <button 
                  onClick={() => handleCheckIn('sakit')}
                  disabled={loading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  Sakit
                </button>
              </div>
            ) : todayRecord.status === 'hadir' && !todayRecord.waktu_pulang ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
                  Masuk: {todayRecord.waktu_masuk?.substring(0, 5)}
                </div>
                <button 
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  <LogOut className="w-5 h-5" />
                  Absen Pulang
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium border border-slate-200">
                <CheckCircle2 className={`w-5 h-5 ${todayRecord.status === 'hadir' ? 'text-emerald-500' : todayRecord.status === 'sakit' ? 'text-amber-500' : 'text-blue-500'}`} />
                {todayRecord.status === 'hadir' 
                  ? `Absensi Hari Ini Selesai (${todayRecord.waktu_masuk?.substring(0, 5)} - ${todayRecord.waktu_pulang?.substring(0, 5)})`
                  : todayRecord.status.charAt(0).toUpperCase() + todayRecord.status.slice(1)
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Report Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <FileText className="w-5 h-5 text-primary" />
            History Absensi
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-700"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-700"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Cari nama karyawan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Karyawan</th>
                <th className="px-6 py-4">Peran</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Waktu Masuk</th>
                <th className="px-6 py-4">Waktu Pulang</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : filteredReportData.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Belum ada data absensi</td></tr>
              ) : (
                filteredReportData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
