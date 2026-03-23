import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSystemSettings } from '../contexts/SystemSettingsContext';

export default function Login() {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Inspiring Text */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="relative z-10 max-w-lg text-center">
          <h1 className="text-5xl font-bold leading-tight mb-8 text-white">
            "Pendidikan adalah tiket ke masa depan, hari esok dimiliki oleh orang-orang yang mempersiapkan diri hari ini."
          </h1>
          <div className="h-1.5 w-24 bg-white/30 mx-auto mb-8 rounded-full"></div>
          <p className="text-2xl text-white/80 font-medium italic">
            — Malcolm X
          </p>
        </div>
      </div>

      {/* Right Side - Logo + Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-20 bg-slate-50 lg:bg-white relative">
        <Link to="/" className="absolute top-8 left-8 sm:left-20 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Kembali ke Beranda</span>
        </Link>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 text-left">
            <div className="flex items-center justify-start gap-3 mb-6">
              {settings.app_logo_url ? (
                <img src={settings.app_logo_url} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <School className="w-12 h-12 text-primary" />
              )}
              <span className="text-3xl font-bold text-slate-900">{settings.app_name}</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
            <p className="text-gray-500">Silakan masuk ke akun Anda</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="admin@sekolah.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
