import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const [taRes, rombelRes, mapelRes, guruRes, ruangRes, jurusanRes, tkRes] = await Promise.all([
    supabase.from('tahun_ajaran').select('*').order('tanggal_mulai', { ascending: false }),
    supabase.from('rombongan_belajar').select('*, jurusan(nama)').order('nama'),
    supabase.from('mata_pelajaran').select('*').order('nama'),
    supabase.from('users').select('id, full_name, user_roles(role)').order('full_name'),
    supabase.from('ruang_kelas').select('*').order('nama'),
    supabase.from('jurusan').select('*').order('nama'),
    supabase.from('tingkat_kelas').select('*').order('urutan')
  ]);
  console.log('taRes error:', taRes.error);
  console.log('guruRes error:', guruRes.error);
}
test();
