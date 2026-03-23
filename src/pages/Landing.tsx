import { Link } from 'react-router-dom';
import { School, CheckCircle2, Calendar, Users, BarChart3, Shield, Zap, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';

export default function Landing() {
  const { settings } = useSystemSettings();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 text-slate-900 font-extrabold text-2xl tracking-tight">
              {settings.app_logo_url ? (
                <img src={settings.app_logo_url} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <School className="w-6 h-6 text-primary" />
                </div>
              )}
              <span>{settings.app_name}</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600">
              <a href="#fitur" className="hover:text-primary transition-colors">Fitur</a>
              <a href="#keunggulan" className="hover:text-primary transition-colors">Keunggulan</a>
              <a href="#statistik" className="hover:text-primary transition-colors">Statistik</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
              >
                Masuk Portal
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-slate-50" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-8 border border-primary/20">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Sistem Informasi Akademik Terpadu
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-tight max-w-5xl mx-auto">
              Transformasi Digital <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-500">
                Sekolah Anda
              </span> Dimulai di Sini
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              Tingkatkan efisiensi manajemen sekolah dengan platform modern yang mengintegrasikan absensi, jadwal pelajaran, dan data akademik dalam satu genggaman.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 flex items-center justify-center gap-2 group"
              >
                Mulai Sekarang
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#fitur"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm border border-slate-200 hover:border-slate-300 flex items-center justify-center"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Semua yang Anda Butuhkan</h2>
              <p className="text-lg text-slate-600">
                Fitur lengkap yang dirancang khusus untuk memenuhi kebutuhan administrasi dan akademik sekolah modern.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Clock,
                  title: 'Absensi Real-time',
                  desc: 'Pencatatan kehadiran siswa dan karyawan secara akurat dan real-time, lengkap dengan rekapitulasi otomatis.'
                },
                {
                  icon: Calendar,
                  title: 'Manajemen Jadwal',
                  desc: 'Susun dan kelola jadwal pelajaran dengan mudah, hindari bentrok, dan pastikan kegiatan belajar mengajar berjalan lancar.'
                },
                {
                  icon: Users,
                  title: 'Data Terpusat',
                  desc: 'Kelola data siswa, guru, dan staf dalam satu database yang aman dan mudah diakses kapan saja.'
                },
                {
                  icon: BookOpen,
                  title: 'Master Data Akademik',
                  desc: 'Pengaturan jurusan, tingkat kelas, tahun ajaran, dan mata pelajaran yang fleksibel sesuai kurikulum.'
                },
                {
                  icon: BarChart3,
                  title: 'Laporan Komprehensif',
                  desc: 'Hasilkan laporan absensi dan akademik dengan satu klik, siap untuk dicetak atau diekspor.'
                },
                {
                  icon: Shield,
                  title: 'Akses Berbasis Peran',
                  desc: 'Keamanan terjamin dengan sistem hak akses yang disesuaikan untuk Admin, Guru, Wali Kelas, dan Staf.'
                }
              ].map((feature, idx) => (
                <div key={idx} className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Red Background Section - Statistics */}
        <section id="statistik" className="py-24 bg-primary relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-[20px] border-white"></div>
            <div className="absolute top-1/2 right-[-10%] w-[40rem] h-[40rem] rounded-full border-[40px] border-white"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Dipercaya oleh Institusi Pendidikan
              </h2>
              <p className="text-primary-100 text-lg md:text-xl max-w-2xl mx-auto text-white/80">
                Bergabunglah dengan komunitas sekolah yang telah merasakan kemudahan manajemen akademik digital.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Siswa Aktif', value: '10,000+' },
                { label: 'Guru & Staf', value: '500+' },
                { label: 'Kelas Dikelola', value: '300+' },
                { label: 'Absensi Tercatat', value: '1M+' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{stat.value}</div>
                  <div className="text-white/80 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section id="keunggulan" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Mengapa Memilih {settings.app_name}?
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Kami memahami kompleksitas manajemen sekolah. Oleh karena itu, kami merancang sistem yang tidak hanya canggih, tetapi juga sangat mudah digunakan oleh semua kalangan.
                </p>
                
                <div className="space-y-6">
                  {[
                    'Antarmuka yang intuitif dan mudah dipelajari',
                    'Dapat diakses dari berbagai perangkat (PC, Tablet, Smartphone)',
                    'Keamanan data terjamin dengan teknologi cloud terkini',
                    'Dukungan teknis yang responsif dan siap membantu'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-slate-700 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-rose-400/20 rounded-[3rem] transform rotate-3 scale-105"></div>
                <img 
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop" 
                  alt="Students learning" 
                  className="relative rounded-[3rem] shadow-2xl object-cover h-[500px] w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Red Background */}
        <section className="py-20 bg-gradient-to-br from-primary to-rose-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
              Siap untuk Memajukan <br />Sekolah Anda ke Era Digital?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Tinggalkan cara manual yang merepotkan. Beralihlah ke sistem modern yang menghemat waktu dan tenaga Anda.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-primary rounded-2xl font-bold text-xl hover:bg-slate-50 transition-all shadow-2xl hover:shadow-white/20 hover:-translate-y-1"
            >
              <Zap className="w-6 h-6" />
              Mulai Gunakan Sekarang
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
                {settings.app_logo_url ? (
                  <img src={settings.app_logo_url} alt="Logo" className="w-8 h-8 object-contain brightness-0 invert" />
                ) : (
                  <School className="w-6 h-6" />
                )}
                <span>{settings.app_name}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Sistem Informasi Akademik Terpadu untuk manajemen sekolah yang lebih baik, efisien, dan modern.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Tautan Cepat</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#fitur" className="hover:text-white transition-colors">Fitur Utama</a></li>
                <li><a href="#keunggulan" className="hover:text-white transition-colors">Keunggulan</a></li>
                <li><a href="#statistik" className="hover:text-white transition-colors">Statistik Pengguna</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Masuk Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Kontak</h3>
              <ul className="space-y-2 text-sm">
                <li>Email: info@sekolahdigital.com</li>
                <li>Telepon: (021) 1234-5678</li>
                <li>Alamat: Jl. Pendidikan No. 1, Jakarta</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} {settings.app_name}. Hak Cipta Dilindungi.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
