import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-application-name': 'my-edu-app' },
  },
});

// Helper to check connection
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('system_settings').select('id').limit(1).single();
    if (error) {
      if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
        return { success: false, message: 'Gagal terhubung ke server Supabase. Pastikan URL dan Key sudah benar, atau proyek Supabase Anda sedang aktif.' };
      }
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan koneksi yang tidak terduga.' };
  }
};
