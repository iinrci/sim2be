import React, { useState, useEffect } from 'react';
import { Save, Upload, School } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';

export default function SystemSettings() {
  const { settings, refreshSettings } = useSystemSettings();
  const [appName, setAppName] = useState(settings.app_name);
  const [logoUrl, setLogoUrl] = useState(settings.app_logo_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setAppName(settings.app_name);
    setLogoUrl(settings.app_logo_url || '');
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: settingsData, error: fetchError } = await supabase.from('system_settings').select('id').single();
      
      if (fetchError) {
        if (fetchError.message.includes('schema cache') || fetchError.message.includes('not found')) {
          throw new Error('Tabel database belum dibuat. Silakan jalankan script SQL dari file sql.txt di Supabase.');
        }
        throw fetchError;
      }

      const { error } = await supabase
        .from('system_settings')
        .update({
          app_name: appName,
          app_logo_url: logoUrl || null,
          updated_at: new Date().toISOString()
        })
        .match({ id: settingsData?.id });

      if (error) throw error;

      await refreshSettings();
      setMessage({ type: 'success', text: 'Konfigurasi sistem berhasil diperbarui' });
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui konfigurasi' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Use a unique filename to avoid cache issues and permission conflicts with fixed names
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('public_storage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Using unique name, so no need for upsert
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Gagal upload: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public_storage')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      setMessage({ type: 'success', text: 'Logo berhasil diunggah. Klik "Simpan Perubahan" untuk menerapkan.' });
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal mengunggah logo' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 mt-1">Konfigurasi identitas aplikasi secara global.</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-4 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Aplikasi</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Contoh: MyEduApp"
                />
                <p className="text-xs text-slate-400 mt-2 italic">
                  * Nama ini akan tampil di Sidebar, Landing Page, dan Login Page.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">URL Logo (Opsional)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="https://example.com/logo.png"
                  />
                  <label className="cursor-pointer px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span className="sm:hidden">Upload Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-500 mb-4 text-center">Preview Identitas</p>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100 max-w-full overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="w-10 h-10 object-contain shrink-0" />
                ) : (
                  <School className="w-10 h-10 text-primary shrink-0" />
                )}
                <span className="text-xl font-bold text-slate-900 truncate">{appName || 'Nama Aplikasi'}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
