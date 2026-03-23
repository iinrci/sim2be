import { useState, useEffect, useRef } from 'react';
import { Search, UserCircle, LogOut, User, ChevronDown, Calendar, Menu } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userData, setUserData] = useState<{ full_name: string; role: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, user_roles(role)')
          .eq('id', user.id)
          .single();
        
        console.log('Header fetch roles data:', data, 'error:', error);
        
        if (data) {
          const roles = data.user_roles?.map((r: any) => r.role) || [];
          // Prioritize 'admin' role if present
          const displayRole = roles.includes('admin') ? 'admin' : (roles.length > 0 ? roles[0] : 'guru');
          setUserData({ 
            full_name: data.full_name, 
            role: displayRole
          });
        } else {
          setUserData({ full_name: user.user_metadata?.full_name || 'User', role: 'guru' });
        }
      }
    };

    fetchUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const formatRole = (role: string) => {
    if (role === 'admin') return 'Administrator';
    if (role === 'wali_kelas') return 'Wali Kelas';
    if (role === 'tenaga_kependidikan') return 'Tenaga Kependidikan';
    return 'Guru';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 relative z-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 hidden md:flex">
          <Calendar className="w-4 h-4 text-slate-400" />
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{userData?.full_name || 'Memuat...'}</p>
              <p className="text-xs text-slate-500">{userData ? formatRole(userData.role) : '...'}</p>
            </div>
            <UserCircle className="w-8 h-8 text-slate-400" />
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 overflow-hidden">
              <Link 
                to="/app/edit-profil" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Edit Profil
              </Link>
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
