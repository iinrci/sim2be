import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, CalendarCheck, BookOpen, Loader2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DashboardStats {
  totalSiswa: number;
  totalGuru: number;
  totalKelas: number;
  attendanceRate: number;
}

const DATE_FILTERS = [
  { label: 'Last 1 Day', value: '1d' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 60 Days', value: '60d' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 1 Year', value: '1y' },
  { label: 'Last 2 Years', value: '2y' },
  { label: 'Custom Date', value: 'custom' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalSiswa: 0, totalGuru: 0, totalKelas: 0, attendanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [attendanceDistribution, setAttendanceDistribution] = useState<any[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<any[]>([]);
  const [scheduleDistribution, setScheduleDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    let end = new Date();
    let start = new Date();

    switch (dateFilter) {
      case '1d': start = subDays(end, 1); break;
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '60d': start = subDays(end, 60); break;
      case '3m': start = subMonths(end, 3); break;
      case '6m': start = subMonths(end, 6); break;
      case '1y': start = subYears(end, 1); break;
      case '2y': start = subYears(end, 2); break;
      case 'custom':
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default: start = subDays(end, 30);
    }

    return { start: startOfDay(start), end: endOfDay(end) };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // 1. Fetch Stats
      const [siswaRes, guruRes, kelasRes, absensiRes] = await Promise.all([
        supabase.from('siswa').select('jenis_kelamin', { count: 'exact' }),
        supabase.from('users').select('*, user_roles!inner(*)', { count: 'exact', head: true }).eq('user_roles.role', 'guru'),
        supabase.from('rombongan_belajar').select('*', { count: 'exact', head: true }),
        supabase.from('absensi').select('status, tanggal').gte('tanggal', startStr).lte('tanggal', endStr)
      ]);

      if (siswaRes.error || guruRes.error || kelasRes.error || absensiRes.error) {
        const err = siswaRes.error || guruRes.error || kelasRes.error || absensiRes.error;
        if (err?.message.includes('schema cache') || err?.message.includes('not found')) {
          setError('Database belum siap. Silakan jalankan script SQL dari file sql.txt di SQL Editor Supabase Anda.');
        } else {
          setError(err?.message || 'Terjadi kesalahan saat mengambil data dashboard.');
        }
        return;
      }

      const totalSiswa = siswaRes.count || 0;
      const totalGuru = guruRes.count || 0;
      const totalKelas = kelasRes.count || 0;
      
      let attendanceRate = 0;
      if (absensiRes.data && absensiRes.data.length > 0) {
        const present = absensiRes.data.filter(a => a.status === 'hadir').length;
        attendanceRate = Math.round((present / absensiRes.data.length) * 100);
      }

      setStats({ totalSiswa, totalGuru, totalKelas, attendanceRate });

      // Process Attendance Trend
      if (absensiRes.data) {
        const trendMap = new Map<string, any>();
        const distMap = { hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0 };

        absensiRes.data.forEach(a => {
          // Trend
          const date = a.tanggal;
          if (!trendMap.has(date)) {
            trendMap.set(date, { date, hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0 });
          }
          const dayData = trendMap.get(date);
          if (a.status in dayData) dayData[a.status]++;
          
          // Distribution
          if (a.status in distMap) distMap[a.status as keyof typeof distMap]++;
        });

        const sortedTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        setAttendanceTrend(sortedTrend);

        const distData = [
          { name: 'Hadir', value: distMap.hadir, color: '#10b981' },
          { name: 'Sakit', value: distMap.sakit, color: '#3b82f6' },
          { name: 'Izin', value: distMap.izin, color: '#f59e0b' },
          { name: 'Alpa', value: distMap.alpa, color: '#ef4444' },
          { name: 'Terlambat', value: distMap.terlambat, color: '#8b5cf6' },
        ].filter(d => d.value > 0);
        setAttendanceDistribution(distData);
      }

      // Process Gender Distribution
      if (siswaRes.data) {
        const l = siswaRes.data.filter(s => s.jenis_kelamin === 'L').length;
        const p = siswaRes.data.filter(s => s.jenis_kelamin === 'P').length;
        setGenderDistribution([
          { name: 'Laki-laki', value: l, color: '#3b82f6' },
          { name: 'Perempuan', value: p, color: '#ec4899' }
        ]);
      }

      // Process Schedule Distribution
      const { data: scheduleData } = await supabase.from('jadwal_pelajaran').select('hari');
      if (scheduleData) {
        const hariMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const counts = [0, 0, 0, 0, 0, 0, 0];
        scheduleData.forEach(s => {
          if (s.hari >= 0 && s.hari <= 6) counts[s.hari]++;
        });
        const schedDist = counts.map((count, index) => ({
          name: hariMap[index],
          value: count
        })).filter(d => d.value > 0);
        setScheduleDistribution(schedDist);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { name: 'Total Siswa', value: stats.totalSiswa.toLocaleString(), icon: GraduationCap, gradient: 'from-blue-500 to-blue-600' },
    { name: 'Total Guru', value: stats.totalGuru.toLocaleString(), icon: Users, gradient: 'from-emerald-500 to-emerald-600' },
    { name: 'Kelas Aktif', value: stats.totalKelas.toLocaleString(), icon: BookOpen, gradient: 'from-amber-500 to-amber-600' },
    { name: 'Kehadiran (Periode Ini)', value: `${stats.attendanceRate}%`, icon: CalendarCheck, gradient: 'from-rose-500 to-rose-600' },
  ];

  if (loading && stats.totalSiswa === 0 && !error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 max-w-md">
          <h2 className="text-lg font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm opacity-90 mb-4">{error}</p>
          <button 
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="space-y-6">
      <div id="dashboard-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="dashboard-title" className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p id="dashboard-subtitle" className="text-slate-500 mt-1">Selamat datang kembali di sistem manajemen sekolah.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filter:</span>
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {DATE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      <div id="dashboard-stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div id={`stat-card-${stat.name.toLowerCase().replace(/\s+/g, '-')}`} key={stat.name} className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 shadow-lg shadow-slate-200/50`}>
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/80">{stat.name}</p>
              <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12">
              <stat.icon size={120} className="text-white" />
            </div>
            <div className="absolute top-4 right-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <stat.icon className="w-5 h-5 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Distribusi Kehadiran</h2>
          <div className="h-[300px] w-full">
            {attendanceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {attendanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Tidak ada data kehadiran.
              </div>
            )}
          </div>
        </div>

        {/* Gender Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Distribusi Siswa (Gender)</h2>
          <div className="h-[300px] w-full">
            {genderDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {genderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Tidak ada data siswa.
              </div>
            )}
          </div>
        </div>

        {/* Schedule Distribution Bar Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Distribusi Jadwal per Hari</h2>
          <div className="h-[300px] w-full">
            {scheduleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scheduleDistribution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" name="Jumlah Jadwal" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Tidak ada data jadwal.
              </div>
            )}
          </div>
        </div>

        {/* Attendance Trend Line Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Tren Kehadiran</h2>
          <div className="h-[300px] w-full">
            {attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(val) => format(new Date(val), 'd MMM')} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(val) => format(new Date(val), 'dd MMMM yyyy', { locale: id })}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="hadir" name="Hadir" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="sakit" name="Sakit" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="izin" name="Izin" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="alpa" name="Alpa" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Tidak ada data kehadiran untuk periode ini.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
