import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CalendarCheck, CalendarDays, 
  School, GraduationCap, Database, ChevronDown, ChevronRight, UserCheck,
  Settings, ClipboardList, X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { supabase } from '../lib/supabase';

const menuItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, color: 'bg-indigo-500' },
  { name: 'Absensi Siswa', path: '/app/absensi', icon: CalendarCheck, color: 'bg-emerald-500' },
  { name: 'Absensi Karyawan', path: '/app/absensi-karyawan', icon: UserCheck, color: 'bg-cyan-500' },
  { name: 'Rekap Absensi', path: '/app/rekap-absensi', icon: ClipboardList, color: 'bg-violet-500', subItems: [
    { name: 'Absensi Siswa', path: '/app/rekap-absensi/siswa' },
    { name: 'Absensi Karyawan', path: '/app/rekap-absensi/karyawan' },
  ]},
  { name: 'Jadwal Pelajaran', path: '/app/jadwal-pelajaran', icon: CalendarDays, color: 'bg-amber-500' },
  { name: 'Kelola Kelas', path: '/app/kelola-kelas', icon: School, color: 'bg-rose-500' },
  { name: 'Data Siswa', path: '/app/data-siswa', icon: GraduationCap, color: 'bg-orange-500' },
  { name: 'User Management', path: '/app/user-management', icon: Users, color: 'bg-blue-500' },
];

const masterDataItems = [
  { name: 'Jurusan', path: '/app/master-data/jurusan' },
  { name: 'Tingkat Kelas', path: '/app/master-data/tingkat-kelas' },
  { name: 'Tahun Ajaran', path: '/app/master-data/tahun-ajaran' },
  { name: 'Rombongan Belajar', path: '/app/master-data/rombongan-belajar' },
  { name: 'Mata Pelajaran', path: '/app/master-data/mata-pelajaran' },
  { name: 'Ruang Kelas', path: '/app/master-data/ruang-kelas' },
  { name: 'System Settings', path: '/app/master-data/system-settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { settings } = useSystemSettings();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isMasterOpen, setIsMasterOpen] = useState(
    location.pathname.includes('/master-data')
  );

  useEffect(() => {
    // Close sidebar on route change on mobile
    onClose();
  }, [location.pathname]);

  useEffect(() => {
    const fetchUserRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('user_roles(role)')
          .eq('id', user.id)
          .single();
        
        console.log('Fetch roles data:', data, 'error:', error);
        
        if (data) {
          const roles = data.user_roles?.map((r: any) => r.role) || [];
          setUserRoles(roles);
        }
      }
    };
    fetchUserRoles();
  }, []);

  const filteredMenuItems = menuItems.filter(item => {
    if (userRoles.length === 0) return false;
    if (userRoles.includes('admin')) return true;
    
    // Tenaga Kependidikan can access Absensi Karyawan and Dashboard
    if (userRoles.includes('tenaga_kependidikan')) {
      return ['Dashboard', 'Absensi Karyawan'].includes(item.name);
    }

    // Guru/Wali Kelas can access most things except User Management and Rekap Absensi
    if (item.name === 'User Management') return false;
    if (item.name === 'Rekap Absensi') return false;

    return true;
  });

  const [isRekapOpen, setIsRekapOpen] = useState(location.pathname.includes('/rekap-absensi'));

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-full transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <Link to="/app/dashboard" className="flex items-center gap-2 text-slate-900 font-bold text-xl overflow-hidden">
            {settings.app_logo_url ? (
              <img src={settings.app_logo_url} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <School className="w-6 h-6 text-primary" />
            )}
            <span className="truncate">{settings.app_name}</span>
          </Link>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));

          if (item.subItems) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => setIsRekapOpen(!isRekapOpen)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform',
                      item.color,
                      isActive ? 'scale-110 shadow-lg shadow-primary/20' : 'opacity-80'
                    )}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    {item.name}
                  </div>
                  {isRekapOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isRekapOpen && (
                  <div className="mt-1 space-y-1 pl-11 pr-3">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={clsx(
                          'block px-3 py-2 rounded-lg text-sm transition-colors',
                          location.pathname === sub.path
                            ? 'bg-slate-100 text-slate-900 font-medium'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform',
                item.color,
                isActive ? 'scale-110 shadow-lg shadow-primary/20' : 'opacity-80'
              )}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              {item.name}
            </Link>
          );
        })}

        {userRoles.includes('admin') && (
          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              onClick={() => setIsMasterOpen(!isMasterOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-500',
                  isMasterOpen ? 'scale-110 shadow-lg shadow-slate-500/20' : 'opacity-80'
                )}>
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span>Master Data</span>
              </div>
              {isMasterOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isMasterOpen && (
              <div className="mt-1 space-y-1 pl-11 pr-3">
                {masterDataItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={clsx(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
    </>
  );
}
