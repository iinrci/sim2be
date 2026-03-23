/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/app/Dashboard';
import GenericMasterData from './pages/app/master-data/GenericMasterData';
import TahunAjaran from './pages/app/master-data/TahunAjaran';
import RombonganBelajar from './pages/app/master-data/RombonganBelajar';
import SystemSettings from './pages/app/master-data/SystemSettings';
import JadwalPelajaran from './pages/app/JadwalPelajaran';
import Absensi from './pages/app/Absensi';
import AbsensiKaryawan from './pages/app/AbsensiKaryawan';
import RekapAbsensiSiswa from './pages/app/RekapAbsensiSiswa';
import RekapAbsensiKaryawan from './pages/app/RekapAbsensiKaryawan';
import KelolaKelas from './pages/app/KelolaKelas';
import DataSiswa from './pages/app/DataSiswa';
import DataGuru from './pages/app/DataGuru';
import UserManagement from './pages/app/UserManagement';
import EditProfil from './pages/app/EditProfil';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="edit-profil" element={<EditProfil />} />
          <Route path="absensi" element={<Absensi />} />
          <Route path="absensi-karyawan" element={<AbsensiKaryawan />} />
          <Route path="rekap-absensi">
            <Route path="siswa" element={<RekapAbsensiSiswa />} />
            <Route path="karyawan" element={<RekapAbsensiKaryawan />} />
          </Route>
          <Route path="jadwal-pelajaran" element={<JadwalPelajaran />} />
          <Route path="kelola-kelas" element={<KelolaKelas />} />
          <Route path="data-guru" element={<DataGuru />} />
          <Route path="data-siswa" element={<DataSiswa />} />
          
          <Route path="master-data">
            <Route path="jurusan" element={<GenericMasterData title="Jurusan" table="jurusan" columns={['nama', 'keterangan']} />} />
            <Route path="tingkat-kelas" element={<GenericMasterData title="Tingkat Kelas" table="tingkat_kelas" columns={['urutan', 'nama']} />} />
            <Route path="tahun-ajaran" element={<TahunAjaran />} />
            <Route path="rombongan-belajar" element={<RombonganBelajar />} />
            <Route path="mata-pelajaran" element={<GenericMasterData title="Mata Pelajaran" table="mata_pelajaran" columns={['nama', 'kode']} />} />
            <Route path="ruang-kelas" element={<GenericMasterData title="Ruang Kelas" table="ruang_kelas" columns={['nama']} />} />
            <Route path="system-settings" element={<SystemSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
