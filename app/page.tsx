"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, BookOpen, UserPlus, Activity, 
  CheckCircle, ShieldAlert, FileText, Edit2, 
  Trash2, X, Clock, TrendingUp, AlertTriangle, 
  Info, BookMarked, Wallet, BellRing, LogOut, 
  ShieldCheck, Scale, AlertOctagon, RefreshCw, Bell, ShieldX, Octagon, AlertCircle,
  Download, Lock, Key, Shield, TrendingDown
} from 'lucide-react';

// =============================================================================
// 🗄️ STRUKTUR DATA & DEFINISI TIPE (SESUAI DOKUMEN LEGAL)
// =============================================================================

type Role = 'ADMIN_PUSAT' | 'TAMU_AUDITOR';

type TxType = 'kontribusi' | 'pengembalian' | 'pinjaman' | 'pemasukan_lain' | 'pengeluaran_lain' | 'refund_keluar';

type Transaction = {
  id: string;
  tanggal: string;
  hmpsId: string | 'umum'; 
  tipe: TxType;
  keterangan: string;
  nominal: number;
  pemasukan: number;
  pengeluaran: number;
  saldoAkhir: number;
};

type HMPSMember = {
  id: string;
  nama: string;
  tanggalDaftar: string;
};

export default function LumbungSystem() {
  // --- 🔐 STATE OTENTIKASI (FITUR LEVEL AKSES) ---
  const [auth, setAuth] = useState<{isLoggedIn: boolean, role: Role | null}>({ isLoggedIn: false, role: null });
  const [loginPass, setLoginPass] = useState('');

  // --- 🧭 STATE NAVIGASI & DATA ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'buku-kas' | 'evaluasi' | 'registrasi' | 'panduan'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<HMPSMember[]>([]);
  
  // --- 📝 STATE FORM & UI ---
  const [formKas, setFormKas] = useState({ tanggal: '', hmpsId: 'umum', tipe: 'kontribusi' as TxType, keterangan: '', nominal: '' });
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [formReg, setFormReg] = useState({ namaHMPS: '', sepakatADART: false });
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- 🔔 UI STATE: POP-UP, PANEL & MODAL PROTEKSI ---
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [errorModal, setErrorModal] = useState<{show: boolean, title: string, message: string, type: 'danger' | 'warning'}>({
    show: false, title: '', message: '', type: 'danger'
  });

  // =============================================================================
  // 🌐 PERSIAPAN BACKEND TRANSITION (ABSTRAKSI ASYNC)
  // =============================================================================
  const db = {
    save: async (key: string, data: any) => {
      return new Promise((resolve) => {
        localStorage.setItem(key, JSON.stringify(data));
        resolve(true);
      });
    },
    load: async (key: string) => {
      return new Promise<any>((resolve) => {
        const data = localStorage.getItem(key);
        resolve(data ? JSON.parse(data) : null);
      });
    }
  };

  useEffect(() => {
    // Inisialisasi Pangkalan Data
    const initData = async () => {
      const savedTransactions = await db.load('lumbung_master_final_tx');
      const savedMembers = await db.load('lumbung_master_final_members');
      
      if (savedTransactions) setTransactions(savedTransactions);
      if (savedMembers) setMembers(savedMembers);
    };

    initData();

    // Sinkronisasi Engine Waktu Real-Time
    setCurrentDate(new Date());
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); 

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Auto-Save setiap ada perubahan state data
    if (currentDate) {
      db.save('lumbung_master_final_tx', transactions);
      db.save('lumbung_master_final_members', members);
    }
  }, [transactions, members, currentDate]);

  // =============================================================================
  // 🔑 LOGIKA AKSES (LOGIN & OTORISASI)
  // =============================================================================

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPass === 'bem2026') {
      setAuth({ isLoggedIn: true, role: 'ADMIN_PUSAT' });
    } else if (loginPass === 'tamu') {
      setAuth({ isLoggedIn: true, role: 'TAMU_AUDITOR' });
    } else {
      triggerError("Otoritas Ditolak", "Kata sandi salah. Akses ke sistem lumbung memerlukan izin digital dari BEM STKIP Citra Bakti.");
    }
    setLoginPass('');
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, role: null });
    setActiveTab('dashboard');
  };

  // =============================================================================
  // 📊 LOGIKA EKSPOR (EXCEL/CSV GENERATOR)
  // =============================================================================

  const exportToCSV = () => {
    setIsExporting(true);
    const headers = ["ID Transaksi", "Tanggal", "Entitas HMPS", "Tipe Mutasi", "Keterangan", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo Akhir (Rp)"];
    
    const rows = transactions.map(tx => {
      const hmps = members.find(m => m.id === tx.hmpsId);
      return [
        tx.id,
        tx.tanggal,
        hmps ? hmps.nama : 'KAS UMUM TERPUSAT',
        tx.tipe,
        `"${tx.keterangan}"`,
        tx.pemasukan,
        tx.pengeluaran,
        tx.saldoAkhir
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `LAPORAN_LUMBUNG_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setIsExporting(false), 800);
  };

  // =============================================================================
  // 🧠 MESIN KALKULASI, AUDIT TREN, & LOGIKA AD/ART
  // =============================================================================
  
  const totalSaldo = transactions.length > 0 ? transactions[transactions.length - 1].saldoAkhir : 0;
  
  // Pembagian Dana Berdasarkan ART Pasal 5
  const DMM = totalSaldo * 0.4; // 40% Cadangan Mati (DMM)
  const DLK = totalSaldo * 0.6; // 60% Dana Likuid Kegiatan (DLK)

  // Fungsi Rekalkulasi Saldo Berantai
  const recalculateBalances = (txs: Transaction[]) => {
    let currentSaldo = 0;
    return txs.map(tx => {
      currentSaldo = currentSaldo + tx.pemasukan - tx.pengeluaran;
      return { ...tx, saldoAkhir: currentSaldo };
    });
  };

  // Fungsi Analisis Performa Entitas HMPS (Termasuk Tren Iuran Berantai & Pemulihan)
  const getHMPSStats = (hmpsId: string) => {
    let totalKontribusi = 0;
    let pinjamanAktif = 0;
    let lastPinjamanDate: Date | null = null;
    const riwayatIuran: number[] = [];

    transactions.forEach(tx => {
      if (tx.hmpsId === hmpsId) {
        if (tx.tipe === 'kontribusi') {
          totalKontribusi += tx.nominal;
          riwayatIuran.push(tx.nominal);
        }
        if (tx.tipe === 'pinjaman') {
          pinjamanAktif += tx.nominal;
          lastPinjamanDate = new Date(tx.tanggal);
        }
        if (tx.tipe === 'pengembalian') {
          pinjamanAktif -= tx.nominal;
          if (pinjamanAktif <= 0) pinjamanAktif = 0;
        }
      }
    });

    // --- ALGORITMA DETEKSI TREN IURAN ---
    let trenMenurun = false;
    let trenMenurunKritis = false; // <--- Skenario Risiko Kritis 6 Bulan
    let trenMeningkat = false;     // <--- Skenario Pemulihan Produktivitas (FITUR BARU)

    if (riwayatIuran.length >= 3) {
      const last = riwayatIuran[riwayatIuran.length - 1];
      const prev1 = riwayatIuran[riwayatIuran.length - 2];
      const prev2 = riwayatIuran[riwayatIuran.length - 3];
      
      // Deteksi Penurunan 3 Bulan
      if (last < prev1 && prev1 < prev2) {
        trenMenurun = true;
      }
      // Deteksi Peningkatan (Pemulihan) 3 Bulan
      else if (last > prev1 && prev1 > prev2) {
        trenMeningkat = true;
      }
    }

    // Cek jika 6 bulan berturut-turut menurun (Kritis)
    if (riwayatIuran.length >= 6) {
       const [m6, m5, m4, m3, m2, m1] = riwayatIuran.slice(-6);
       if (m1 < m2 && m2 < m3 && m3 < m4 && m4 < m5 && m5 < m6) {
         trenMenurunKritis = true;
       }
    }

    // Batas Maksimal Pinjaman (2x Total Kontribusi)
    const batasPinjaman = totalKontribusi * 2; 
    
    // Deteksi Jatuh Tempo Administratif (30 Hari - ART Pasal 2)
    let jatuhTempoStr = "-";
    let isTerlambat = false;
    let hariKeterlambatan = 0;

    if (pinjamanAktif > 0 && lastPinjamanDate && currentDate) {
      const jtDate = new Date(lastPinjamanDate);
      jtDate.setDate(jtDate.getDate() + 30);
      jatuhTempoStr = jtDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      
      const today = new Date(currentDate);
      today.setHours(0,0,0,0);
      jtDate.setHours(0,0,0,0);
      
      if (today > jtDate) {
        isTerlambat = true;
        const diffTime = Math.abs(today.getTime() - jtDate.getTime());
        hariKeterlambatan = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }
    }

    const sisaKuota = batasPinjaman - pinjamanAktif;
    const rasioKeuangan = batasPinjaman > 0 ? (sisaKuota / batasPinjaman) * 100 : 0;

    // Penentuan Skor Disiplin: Kritis = 20, Terlambat = 40, Waspada = 60, Normal/Meningkat = 100
    let skorDisiplin = 100;
    if (trenMenurunKritis) skorDisiplin = 20;
    else if (isTerlambat) skorDisiplin = 40;
    else if (trenMenurun) skorDisiplin = 60;
    // Jika trenMeningkat, skor dipertahankan 100 karena disiplin membaik

    return { 
      totalKontribusi, 
      pinjamanAktif, 
      sisaKuota, 
      saldoRefund: totalKontribusi - pinjamanAktif, 
      batasPinjaman, 
      jatuhTempoStr, 
      isTerlambat, 
      hariKeterlambatan, 
      rasioKeuangan,
      trenMenurun, 
      trenMenurunKritis,
      trenMeningkat, // <-- Menyuntikkan status pemulihan ke Rapor
      skorDisiplin 
    };
  };

  // Penerjemah Status Berdasarkan ART Pasal 5 dan Analisis Tren
  function getStatusProduktivitas(disiplin: number, rasio: number, trenMenurun: boolean, trenMenurunKritis: boolean, trenMeningkat: boolean) {
    if (disiplin === 20 || trenMenurunKritis) {
       return { label: "BERMASALAH", color: "text-red-500", bg: "bg-red-500/10 border-red-500", desc: "ANCAMAN TERMINASI: Tren iuran menurun 6 bulan berturut-turut." };
    }
    if (disiplin === 40) {
      return { label: "BERMASALAH", color: "text-red-500", bg: "bg-red-500/10 border-red-500", desc: "SANKSI: Pelanggaran tenggat pelunasan." };
    }
    if (rasio < 30) {
      return { label: "BERMASALAH", color: "text-red-500", bg: "bg-red-500/10 border-red-500", desc: "Defisit likuiditas di bawah 30%." };
    }
    if (trenMenurun) {
      return { label: "WASPADA", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500", desc: "Tren iuran menurun 3 bulan beruntun." };
    }
    if (rasio >= 60 && rasio <= 75) {
      return { label: "SEHAT", color: "text-green-500", bg: "bg-green-500/10 border-green-500", desc: trenMeningkat ? "Status Ideal dengan tren pemulihan positif." : "Status Ideal sesuai Pasal 5." };
    }
    if (rasio > 75) {
      return { label: "SEHAT", color: "text-green-500", bg: "bg-green-500/10 border-green-500", desc: trenMeningkat ? "Likuiditas Kuat & Tren Terus Meningkat." : "Likuiditas Keuangan Sangat Aman." };
    }
    return { label: "WASPADA", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500", desc: trenMeningkat ? "Rasio Kritis namun sedang dalam TREN PEMULIHAN." : "Rasio Kritis mendekati ambang batas." };
  }

  // =============================================================================
  // 📝 HANDLER AKSI (PENGELOLA DATA UTAMA)
  // =============================================================================

  const triggerError = (title: string, message: string, type: 'danger' | 'warning' = 'danger') => {
    setErrorModal({ show: true, title, message, type });
  };

  const handleSimpanKas = (e: React.FormEvent) => {
    e.preventDefault();

    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Akses Ditolak", "Hanya Administrator Pusat (Bendahara Umum) yang memiliki otoritas untuk menambah atau mengedit jurnal kas.");
    }

    const nominal = parseFloat(formKas.nominal);
    if (isNaN(nominal) || nominal <= 0) {
      return triggerError("Kesalahan Input", "Nominal transaksi wajib berupa angka valid di atas nol.");
    }

    if (formKas.tipe === 'pinjaman' && formKas.hmpsId !== 'umum') {
      const stats = getHMPSStats(formKas.hmpsId);
      
      if (nominal > stats.sisaKuota) {
        return triggerError(
          "Plafon Melampaui Batas", 
          `Otorisasi permohonan pinjaman sebesar Rp ${nominal.toLocaleString('id-ID')} DITOLAK. \nMaksimal sisa kuota yang diizinkan untuk organisasi ini adalah Rp ${stats.sisaKuota.toLocaleString('id-ID')}.`
        );
      }
      
      if (nominal > DLK) {
        return triggerError(
          "Proteksi Dana Cadangan", 
          `Pencairan dana bantuan DIBLOKIR. \nSistem mendeteksi transaksi ini akan mengurangi Dana Mengendap Minimum (DMM 40%) yang dilarang untuk disentuh sesuai Pasal 5 AD/ART. \nSisa Likuiditas yang tersedia: Rp ${DLK.toLocaleString('id-ID')}.`
        );
      }
    }

    const isPemasukan = ['kontribusi', 'pengembalian', 'pemasukan_lain'].includes(formKas.tipe);
    let updatedTxs = [...transactions];

    if (editingTxId) {
      const index = updatedTxs.findIndex(t => t.id === editingTxId);
      if (index !== -1) {
        updatedTxs[index] = { 
          ...updatedTxs[index], 
          tanggal: formKas.tanggal, 
          hmpsId: formKas.hmpsId, 
          tipe: formKas.tipe, 
          keterangan: formKas.keterangan, 
          nominal, 
          pemasukan: isPemasukan ? nominal : 0, 
          pengeluaran: !isPemasukan ? nominal : 0 
        };
      }
      setEditingTxId(null);
    } else {
      updatedTxs.push({ 
        id: Date.now().toString(), 
        tanggal: formKas.tanggal, 
        hmpsId: formKas.hmpsId, 
        tipe: formKas.tipe, 
        keterangan: formKas.keterangan, 
        nominal, 
        pemasukan: isPemasukan ? nominal : 0, 
        pengeluaran: !isPemasukan ? nominal : 0, 
        saldoAkhir: 0 
      });
      updatedTxs.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    }

    setTransactions(recalculateBalances(updatedTxs));
    setFormKas({ tanggal: '', hmpsId: 'umum', tipe: 'kontribusi', keterangan: '', nominal: '' });
  };

  const handleKeluarLumbung = (member: HMPSMember) => {
    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Akses Ditolak", "Otorisasi terminasi anggota dan pencairan refund hanya dapat dilakukan oleh Admin Pusat.");
    }

    const stats = getHMPSStats(member.id);
    
    if (stats.pinjamanAktif > 0) {
      return triggerError(
        "Terminasi Ditolak", 
        `Proses pengunduran diri ${member.nama} tidak dapat disahkan karena masih memiliki kewajiban bantuan aktif sebesar Rp ${stats.pinjamanAktif.toLocaleString('id-ID')}.`
      );
    }

    if (stats.saldoRefund > DLK) {
      return triggerError(
        "Likuiditas Terbatas", 
        `Pencairan refund saat ini akan mengganggu stabilitas Dana Mengendap (40%). Proses pengembalian ditunda hingga saldo DLK mencukupi.`
      );
    }

    if (confirm(`OTORISASI TERMINASI: \nKembalikan hak kontribusi nett sebesar Rp ${stats.saldoRefund.toLocaleString('id-ID')} kepada ${member.nama} dan hapus organisasi dari sistem aktif?`)) {
      const refundTx: Transaction = { 
        id: `REF-${Date.now()}`, 
        tanggal: new Date().toISOString().split('T')[0], 
        hmpsId: member.id, 
        tipe: 'refund_keluar', 
        keterangan: `TERMINASI & REFUND: ${member.nama}`, 
        nominal: stats.saldoRefund, 
        pemasukan: 0, 
        pengeluaran: stats.saldoRefund, 
        saldoAkhir: 0 
      };
      setTransactions(recalculateBalances([...transactions, refundTx]));
      setMembers(members.filter(m => m.id !== member.id));
    }
  };

  const handleEditTx = (tx: Transaction) => {
    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Akses Ditolak", "Hanya Admin yang dapat merevisi mutasi kas.");
    }
    setEditingTxId(tx.id);
    setFormKas({ tanggal: tx.tanggal, hmpsId: tx.hmpsId, tipe: tx.tipe, keterangan: tx.keterangan, nominal: tx.nominal.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTx = (id: string) => {
    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Akses Ditolak", "Hanya Admin yang dapat mencabut mutasi kas.");
    }
    if (confirm("KONFIRMASI: Hapus permanen mutasi jurnal kas ini?")) {
      setTransactions(recalculateBalances(transactions.filter(t => t.id !== id)));
    }
  };

  const handleRegistrasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Akses Ditolak", "Hanya Admin Pusat yang dapat mensahkan keanggotaan entitas baru.");
    }
    if (!formReg.sepakatADART) return triggerError("Gagal Registrasi", "Himpunan wajib menyatakan kesepakatan terhadap AD/ART secara hukum.");
    
    setMembers([...members, { 
      id: Date.now().toString(), 
      nama: formReg.namaHMPS, 
      tanggalDaftar: new Date().toISOString().split('T')[0] 
    }]);
    setFormReg({ namaHMPS: '', sepakatADART: false });
    setActiveTab('dashboard');
  };

  const handleMasterReset = () => {
    if (auth.role !== 'ADMIN_PUSAT') {
      return triggerError("Pelanggaran Keamanan Kritis", "Otoritas Tamu/Auditor dilarang keras melakukan manipulasi database inti (Master Reset). Sistem mencatat percobaan akses ilegal ini.");
    }
    if (confirm("⚠️ PERINGATAN KRITIS: Anda akan menghapus seluruh database lumbung secara permanen. Lanjutkan Master Reset?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- Filter Notifikasi Pelanggaran (Mengecualikan yang positif) ---
  const daftarPelanggaran = members
    .map(m => ({ ...m, stats: getHMPSStats(m.id) }))
    .filter(m => m.stats.isTerlambat || m.stats.trenMenurun || m.stats.trenMenurunKritis);

  if (!currentDate) return null;

  // =============================================================================
  // 🔐 SCREEN: LOGIN PROTEKSI (SHIELD SYSTEM)
  // =============================================================================

  if (!auth.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans selection:bg-[#FF6A00] selection:text-black">
        <div className="w-full max-w-md bg-black border border-gray-800 rounded-3xl p-10 shadow-[0_0_100px_rgba(255,106,0,0.1)] animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="inline-flex p-5 bg-[#FF6A00]/10 rounded-full mb-6 text-[#FF6A00] border border-[#FF6A00]/20 shadow-[0_0_30px_rgba(255,106,0,0.2)]">
              <Shield size={48} />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Lumbung Otoritas</h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-3">Digital Audit & Kas Terpadu BEM STKIP</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1 flex items-center gap-2">
                <Lock size={12}/> Kredensial Akses Sistem
              </label>
              <div className="relative group">
                <Key className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-600 group-focus-within:text-[#FF6A00] transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="Masukkan Kata Sandi..."
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-5 pl-14 pr-6 text-sm focus:border-[#FF6A00] outline-none text-white font-black transition-all shadow-inner"
                />
              </div>
            </div>
            <button className="w-full bg-[#FF6A00] hover:bg-orange-500 text-black font-black py-5 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_20px_rgba(255,106,0,0.3)]">
              Buka Pangkalan Data
            </button>
            
            <div className="mt-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
                Informasi Login:<br/>
                <span className="text-[#FF6A00]">Admin:</span> <code className="text-white bg-black px-1 py-0.5 rounded">bem2026</code> <br/>
                <span className="text-blue-400">Auditor/Tamu:</span> <code className="text-white bg-black px-1 py-0.5 rounded">tamu</code>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =============================================================================
  // 🎨 RENDER TAMPILAN ANTARMUKA (VISUAL COMPONENT UTAMA)
  // =============================================================================

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#FF6A00] selection:text-black pb-20 overflow-x-hidden">
      
      {/* 🧭 NAVIGATION BAR (UTAMA) */}
      <nav className="border-b border-gray-800 bg-black sticky top-0 z-[60] shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-6 overflow-x-auto min-w-[850px]">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-black text-[#FF6A00] flex items-center gap-2 tracking-tighter uppercase cursor-default">
                <Wallet size={24} /> Lumbung Bersama
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Digital Otoritas BEM STKIP</p>
                {/* Badge Otoritas Akses */}
                <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${auth.role === 'ADMIN_PUSAT' ? 'bg-red-600/20 text-red-500 border-red-600/30' : 'bg-blue-600/20 text-blue-400 border-blue-600/30'}`}>
                  {auth.role === 'ADMIN_PUSAT' ? 'ADMIN PUSAT' : 'TAMU AUDITOR'}
                </span>
              </div>
            </div>
            
            {/* 🔔 TOMBOL PUSAT NOTIFIKASI MELAYANG */}
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className={`relative p-3 rounded-full transition-all active:scale-90 shadow-lg ${daftarPelanggaran.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-900 text-gray-500'}`}
            >
              <Bell size={20} />
              {daftarPelanggaran.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-red-600 shadow-xl">
                  {daftarPelanggaran.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dasbor' },
              { id: 'buku-kas', icon: BookOpen, label: 'Buku Kas' },
              { id: 'evaluasi', icon: Activity, label: 'Rapor' },
              { id: 'registrasi', icon: UserPlus, label: 'Registrasi' },
              { id: 'panduan', icon: BookMarked, label: 'SOP & Panduan' },
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#FF6A00] text-black shadow-[0_0_15px_rgba(255,106,0,0.4)]' : 'hover:bg-gray-900 text-gray-400'}`}
              >
                <tab.icon size={14} /> <span>{tab.label}</span>
              </button>
            ))}
            
            {/* Tombol Logout */}
            <button 
              onClick={handleLogout} 
              className="ml-4 px-4 py-2 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 hover:bg-red-600/20 text-gray-500 hover:text-red-500 border border-transparent hover:border-red-600/30"
              title="Keluar dari Sistem"
            >
              <LogOut size={14} /> <span>Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* --- 🛑 MODAL DIALOG PROTEKSI (POP-UP VALIDASI) --- */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#111] border-2 border-red-600 w-full max-w-md rounded-2xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-600/20 rounded-full text-red-500">
                <Octagon size={48} className="animate-bounce" />
              </div>
            </div>
            <h3 className="text-xl font-black text-center text-white uppercase tracking-tighter mb-2">{errorModal.title}</h3>
            <p className="text-gray-400 text-sm text-center leading-relaxed whitespace-pre-wrap">{errorModal.message}</p>
            <button 
              onClick={() => setErrorModal({...errorModal, show: false})}
              className="w-full mt-8 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Saya Mengerti & Mengakui
            </button>
          </div>
        </div>
      )}

      {/* --- 🔔 PANEL PUSAT NOTIFIKASI (SIDEBAR OVERLAY) --- */}
      {showNotifPanel && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setShowNotifPanel(false)} />
          <div className="fixed right-6 top-24 w-[380px] bg-[#0A0A0A] border border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[80] animate-in slide-in-from-right duration-300 overflow-hidden">
            <div className="p-5 bg-black border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3">
                <ShieldX size={18} className="text-red-500"/> Pusat Peringatan Sistem
              </h3>
              <button onClick={() => setShowNotifPanel(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto space-y-5">
              {daftarPelanggaran.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <ShieldCheck size={48} className="mx-auto mb-4 opacity-10"/>
                  <p className="text-[10px] uppercase font-black tracking-widest">Sistem dalam kondisi ideal.</p>
                </div>
              ) : (
                daftarPelanggaran.map(p => (
                  <div key={p.id} className={`p-4 rounded-r-xl space-y-2 border-l-4 transition-all ${p.stats.trenMenurunKritis || p.stats.isTerlambat ? 'bg-red-500/5 border-red-600 hover:bg-red-500/10' : 'bg-yellow-500/5 border-yellow-500 hover:bg-yellow-500/10'}`}>
                    <div className="flex justify-between items-start">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${p.stats.trenMenurunKritis || p.stats.isTerlambat ? 'text-red-500' : 'text-yellow-500'}`}>
                         {p.stats.trenMenurunKritis ? 'ANCAMAN TERMINASI' : (p.stats.isTerlambat ? 'Pelanggaran Tenggat' : 'Penurunan Produktivitas')}
                       </p>
                       <AlertCircle size={14} className={p.stats.trenMenurunKritis || p.stats.isTerlambat ? 'text-red-600' : 'text-yellow-500'}/>
                    </div>
                    <p className="text-sm font-black text-white">{p.nama}</p>
                    
                    {p.stats.isTerlambat && (
                      <p className="text-[11px] text-gray-400 leading-tight">Melewati batas pelunasan selama <span className="text-white font-bold">{p.stats.hariKeterlambatan} hari</span>.</p>
                    )}
                    {p.stats.trenMenurunKritis && !p.stats.isTerlambat && (
                      <p className="text-[11px] text-red-400 leading-tight">Sistem mendeteksi <span className="text-red-500 font-bold">penurunan nominal iuran 6 bulan berturut-turut</span>.</p>
                    )}
                    {p.stats.trenMenurun && !p.stats.trenMenurunKritis && !p.stats.isTerlambat && (
                      <p className="text-[11px] text-gray-400 leading-tight">Sistem mendeteksi <span className="text-white font-bold">penurunan nominal iuran 3 bulan berturut-turut</span>.</p>
                    )}
                    
                    <div className={`pt-2 flex items-center gap-2 text-[9px] font-bold uppercase italic ${p.stats.trenMenurunKritis || p.stats.isTerlambat ? 'text-red-400' : 'text-yellow-400'}`}>
                      {p.stats.trenMenurunKritis ? <><AlertOctagon size={10}/> Otoritas Cabut Keanggotaan Terbuka</> : (p.stats.isTerlambat ? <><ShieldAlert size={10}/> Akses Likuiditas Dibekukan</> : <><TrendingDown size={10}/> Status Diturunkan ke Waspada</>)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-gray-900/50 text-center border-t border-gray-800">
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Otoritas Administratif BEM Citra Bakti</p>
            </div>
          </div>
        </>
      )}

      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* --- 📊 TAB: DASBOR INDUK --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-black border border-gray-800 rounded-3xl p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#FF6A00]"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                  <FileText size={16} className="text-[#FF6A00]"/> REKAPITULASI POSISI KEUANGAN GLOBAL
                </h2>
                <div className="flex gap-3 items-center">
                  <div className="text-[10px] text-gray-500 font-black bg-gray-900 border border-gray-800 px-4 py-2 rounded-full uppercase tracking-widest">
                    {currentDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
                  </div>
                  {/* --- TOMBOL EKSPOR PDF/EXCEL --- */}
                  <button 
                    onClick={exportToCSV}
                    disabled={isExporting}
                    className="bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 hover:border-[#FF6A00] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Unduh Laporan Format Excel/CSV"
                  >
                    <Download size={14} className={isExporting ? 'animate-bounce text-[#FF6A00]' : 'text-gray-400'} />
                    {isExporting ? 'Memproses Data...' : 'Ekspor Laporan'}
                  </button>
                </div>
              </div>

              <div className="text-5xl md:text-7xl font-black text-white mt-4 mb-10 tracking-tighter">
                Rp {totalSaldo.toLocaleString('id-ID')}
              </div>
              <div className="flex h-5 w-full rounded-full overflow-hidden bg-gray-900 border border-gray-800 mb-8 p-1 shadow-inner">
                <div className="bg-red-600 h-full transition-all duration-1000 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]" style={{ width: '40%' }}></div>
                <div className="bg-green-600 h-full transition-all duration-1000 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.5)]" style={{ width: '60%' }}></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10 hover:bg-red-500/10 transition-all">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Octagon size={14}/> DMM (Cadangan Mati 40%)</p>
                  <p className="text-2xl font-black text-white">Rp {DMM.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-gray-600 mt-2 italic font-bold">Dilarang digunakan untuk bantuan operasional sesuai AD/ART.</p>
                </div>
                <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/10 hover:bg-green-500/10 transition-all">
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={14}/> DLK (Likuiditas Tersedia 60%)</p>
                  <p className="text-2xl font-black text-white">Rp {DLK.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-gray-600 mt-2 italic font-bold">Plafon sirkulasi aktif untuk bantuan HMPS.</p>
                </div>
              </div>
            </div>

            {/* Monitoring Utama */}
            <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
                <ShieldAlert size={20} className="text-[#FF6A00]" />
                <h3 className="font-black uppercase tracking-widest text-xs">Pangkalan Data Pantauan Anggota</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-widest border-b border-gray-800">
                    <tr>
                      <th className="p-6">Identitas Organisasi</th>
                      <th className="p-6">Akumulasi Iuran</th>
                      <th className="p-6">Plafon Maksimum</th>
                      <th className="p-6 text-red-500">Hutang Berjalan</th>
                      <th className="p-6">Evaluasi Produktivitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {members.length === 0 ? (
                      <tr><td colSpan={5} className="p-16 text-center text-gray-600 italic font-bold uppercase tracking-widest text-[10px]">Basis data nihil. Segera lakukan registrasi entitas.</td></tr>
                    ) : (
                      members.map((m) => {
                        const stats = getHMPSStats(m.id);
                        const statProd = getStatusProduktivitas(stats.skorDisiplin, stats.rasioKeuangan, stats.trenMenurun, stats.trenMenurunKritis, stats.trenMeningkat);
                        return (
                          <tr key={m.id} className="hover:bg-gray-900/40 transition-all group">
                            <td className="p-6 font-black text-white tracking-tight">{m.nama}</td>
                            <td className="p-6 font-bold text-gray-400 tracking-tighter text-base">Rp {stats.totalKontribusi.toLocaleString('id-ID')}</td>
                            <td className="p-6 font-black text-blue-400 text-base">Rp {stats.batasPinjaman.toLocaleString('id-ID')}</td>
                            <td className="p-6 font-black text-red-500 text-base">{stats.pinjamanAktif > 0 ? `Rp ${stats.pinjamanAktif.toLocaleString('id-ID')}` : '-'}</td>
                            <td className="p-6 flex items-center gap-3">
                              <span className={`px-4 py-2 border-2 rounded-lg text-[10px] font-black tracking-[0.2em] shadow-lg ${statProd.bg} ${statProd.color}`}>
                                {statProd.label}
                              </span>
                              {(stats.trenMenurun || stats.trenMenurunKritis) && !stats.isTerlambat && !stats.trenMeningkat && (
                                <span className={`${stats.trenMenurunKritis ? 'text-red-500' : 'text-yellow-500'} animate-pulse`} title="Tren Iuran Menurun"><TrendingDown size={18}/></span>
                              )}
                              {stats.trenMeningkat && !stats.isTerlambat && (
                                <span className="text-green-500 animate-pulse" title="Tren Iuran Meningkat (Pemulihan)"><TrendingUp size={18}/></span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 📖 TAB: BUKU KAS BESAR (LENGKAP DENGAN FITUR REVISI) --- */}
        {activeTab === 'buku-kas' && (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Panel Entri Kas (Merespon Level Akses) */}
            <div className={`lg:col-span-1 border rounded-3xl p-8 h-fit shadow-2xl transition-all duration-500 ${auth.role !== 'ADMIN_PUSAT' ? 'bg-gray-950/50 border-gray-900 opacity-80' : editingTxId ? 'bg-blue-950/20 border-blue-600' : 'bg-black border-gray-800'}`}>
              <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 border-b border-gray-800 pb-5 flex justify-between items-center text-[#FF6A00]">
                {auth.role !== 'ADMIN_PUSAT' ? (
                  <span className="text-gray-500 flex items-center gap-3"><Lock size={18}/> MODE BACA - AKSES AUDITOR</span>
                ) : editingTxId ? (
                  <span className="text-blue-400 flex items-center gap-3"><Edit2 size={18}/> OTORISASI REVISI MUTASI</span>
                ) : (
                  <span className="flex items-center gap-3"><BookOpen size={18}/> ENTRI JURNAL KAS TERPUSAT</span>
                )}
                
                {editingTxId && auth.role === 'ADMIN_PUSAT' && (
                  <button onClick={() => {setEditingTxId(null); setFormKas({ tanggal: '', hmpsId: 'umum', tipe: 'kontribusi', keterangan: '', nominal: '' })}}>
                    <X size={18} className="text-gray-500 hover:text-white"/>
                  </button>
                )}
              </h3>
              
              <form onSubmit={handleSimpanKas} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Tanggal Jurnal Administratif</label>
                  <input type="date" required disabled={auth.role !== 'ADMIN_PUSAT'} value={formKas.tanggal} onChange={e => setFormKas({...formKas, tanggal: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-5 text-sm focus:border-[#FF6A00] outline-none transition-all hover:border-gray-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Subjek Entitas Organisasi</label>
                  <select required disabled={auth.role !== 'ADMIN_PUSAT'} value={formKas.hmpsId} onChange={e => setFormKas({...formKas, hmpsId: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-5 text-sm focus:border-[#FF6A00] outline-none hover:border-gray-500 font-bold appearance-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="umum">-- KAS UMUM / PIHAK LUAR --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Klasifikasi Aliran Dana</label>
                  <select required disabled={auth.role !== 'ADMIN_PUSAT'} value={formKas.tipe} onChange={e => setFormKas({...formKas, tipe: e.target.value as TxType})} className="w-full bg-black border border-gray-700 rounded-xl p-5 text-sm focus:border-[#FF6A00] outline-none hover:border-gray-500 font-bold appearance-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="kontribusi">Debit (Masuk): Iuran Wajib HMPS</option>
                    <option value="pengembalian">Debit (Masuk): Pelunasan Kewajiban</option>
                    <option value="pemasukan_lain">Debit (Masuk): Donatur / Lain-lain</option>
                    <option value="pinjaman">Kredit (Keluar): Pencairan Bantuan Likuiditas</option>
                    <option value="pengeluaran_lain">Kredit (Keluar): Pembiayaan Operasional</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Deskripsi Administratif Lengkap</label>
                  <input type="text" required disabled={auth.role !== 'ADMIN_PUSAT'} placeholder="Sebutkan alasan atau periode dana..." value={formKas.keterangan} onChange={e => setFormKas({...formKas, keterangan: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-5 text-sm focus:border-[#FF6A00] outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Nominal Transaksi (Rp)</label>
                  <input type="number" required disabled={auth.role !== 'ADMIN_PUSAT'} placeholder="0" value={formKas.nominal} onChange={e => setFormKas({...formKas, nominal: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-5 text-lg focus:border-[#FF6A00] outline-none font-black text-[#FF6A00] disabled:opacity-50 disabled:cursor-not-allowed"/>
                </div>
                <button type="submit" disabled={auth.role !== 'ADMIN_PUSAT'} className={`w-full font-black uppercase py-5 rounded-2xl text-xs shadow-2xl transition-all active:scale-95 tracking-[0.2em] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed ${editingTxId ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-[#FF6A00] text-black hover:bg-orange-500'}`}>
                    {editingTxId ? 'VALIDASI PERUBAHAN JURNAL' : 'SAHKAN ENTRI KAS BESAR'}
                </button>
              </form>
            </div>
            
            <div className="lg:col-span-2 bg-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-fit max-h-[90vh]">
              <div className="p-6 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-3">
                  <Activity size={18} className="text-[#FF6A00]" /> RIWAYAT KRONOLOGIS JURNAL UMUM
                </h3>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-900 text-gray-500 uppercase text-[10px] tracking-[0.2em] sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="p-6">Tanggal</th>
                      <th className="p-6">Deskripsi / Subjek</th>
                      <th className="p-6 text-right">Debit</th>
                      <th className="p-6 text-right">Kredit</th>
                      <th className="p-6 text-right font-black">Saldo</th>
                      {auth.role === 'ADMIN_PUSAT' && <th className="p-6 text-center">Opsi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={6} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest text-xs">Riwayat mutasi tidak ditemukan.</td></tr>
                    ) : (
                      transactions.slice().reverse().map((tx) => { 
                        const hmps = members.find(m => m.id === tx.hmpsId); 
                        return (
                          <tr key={tx.id} className="hover:bg-gray-900/40 transition-all group">
                            <td className="p-6 text-gray-500 font-bold">{tx.tanggal}</td>
                            <td className="p-6">
                              <div className="font-black text-white tracking-tight">{tx.keterangan}</div>
                              <div className="text-[9px] text-[#FF6A00] uppercase font-black mt-1.5 flex items-center gap-1.5">
                                <span className="bg-[#FF6A00]/10 px-1.5 py-0.5 rounded border border-[#FF6A00]/20">
                                  {hmps ? hmps.nama : 'KAS UMUM TERPUSAT'}
                                </span>
                              </div>
                            </td>
                            <td className="p-6 text-right text-green-400 font-black tracking-tighter text-base">
                              {tx.pemasukan > 0 ? `Rp ${tx.pemasukan.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="p-6 text-right text-red-500 font-black tracking-tighter text-base">
                              {tx.pengeluaran > 0 ? `Rp ${tx.pengeluaran.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="p-6 text-right font-black text-white text-base">
                              Rp {tx.saldoAkhir.toLocaleString('id-ID')}
                            </td>
                            {/* Opsi Edit/Delete Hanya Muncul untuk Admin */}
                            {auth.role === 'ADMIN_PUSAT' && (
                              <td className="p-6 flex justify-center gap-5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <button onClick={() => handleEditTx(tx)} className="text-blue-400 hover:text-white" title="Revisi Entri"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeleteTx(tx.id)} className="text-red-500 hover:text-white" title="Cabut Mutasi"><Trash2 size={18}/></button>
                              </td>
                            )}
                          </tr>
                        ); 
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 📉 TAB: RAPOR PRODUKTIVITAS & TERMINASI --- */}
        {activeTab === 'evaluasi' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="mb-6 border-b border-gray-800 pb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase flex items-center gap-4 text-[#FF6A00]">
                  <Activity size={32}/> Resolusi Rapor Produktivitas Anggota
                </h2>
                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">Penilaian Otomatis Berbasis Data Kontribusi & Kedisiplinan</p>
              </div>
              <Info size={24} className="text-gray-700 mb-2"/>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {members.map(m => {
                const stats = getHMPSStats(m.id);
                const statProd = getStatusProduktivitas(stats.skorDisiplin, stats.rasioKeuangan, stats.trenMenurun, stats.trenMenurunKritis, stats.trenMeningkat);
                return (
                  <div key={m.id} className={`bg-black border rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col group transition-all duration-500 ${stats.trenMenurunKritis && !stats.isTerlambat ? 'border-red-500/50 hover:border-red-500' : (stats.trenMenurun && !stats.isTerlambat ? 'border-yellow-500/50 hover:border-yellow-500' : (stats.trenMeningkat ? 'border-green-500/50 hover:border-green-500' : 'border-gray-800 hover:border-[#FF6A00]/50'))}`}>
                    <div className={`absolute top-0 left-0 w-full h-2 ${statProd.bg.split(' ')[0].replace('/10', '')}`}></div>
                    
                    <div className="flex justify-between items-start mb-8">
                      <h3 className="font-black text-2xl tracking-tighter text-white">{m.nama}</h3>
                      {/* Tombol Terminasi disembunyikan jika bukan Admin */}
                      {auth.role === 'ADMIN_PUSAT' && (
                        <button 
                          onClick={() => handleKeluarLumbung(m)} 
                          className="p-3 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all active:scale-90" 
                          title="Otorisasi Pengunduran Diri Administratif"
                        >
                          <LogOut size={24}/>
                        </button>
                      )}
                    </div>

                    <div className="space-y-10 flex-1">
                      {/* Indikator Kepatuhan */}
                      <div className="space-y-4">
                        <div className="flex justify-between text-[11px] uppercase font-black text-gray-500 tracking-[0.2em]">
                          <span>Kepatuhan Administratif</span>
                          <span className={stats.skorDisiplin < 50 ? 'text-red-500' : 'text-green-500'}>{stats.skorDisiplin}/100</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                          <div className={`h-full transition-all duration-1000 ${stats.skorDisiplin < 50 ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'bg-green-600'}`} style={{ width: `${stats.skorDisiplin}%` }}></div>
                        </div>
                        {stats.isTerlambat && (
                          <div className="mt-2 text-[10px] text-red-500 font-black uppercase bg-red-600/5 p-4 rounded-xl border border-red-600/20 flex items-center gap-3">
                            <AlertTriangle size={18} className="animate-pulse"/> 
                            <span className="leading-tight">SANKSI AKTIF: TERLAMBAT PELUNASAN {stats.hariKeterlambatan} HARI</span>
                          </div>
                        )}
                        {stats.trenMenurunKritis && !stats.isTerlambat && (
                          <div className="mt-2 text-[10px] text-red-500 font-black uppercase bg-red-600/5 p-4 rounded-xl border border-red-600/20 flex items-center gap-3">
                            <AlertOctagon size={18} className="animate-pulse"/> 
                            <span className="leading-tight">ANCAMAN TERMINASI: TREN IURAN MENURUN 6 BULAN BERUNTUN</span>
                          </div>
                        )}
                        {stats.trenMenurun && !stats.trenMenurunKritis && !stats.isTerlambat && (
                          <div className="mt-2 text-[10px] text-yellow-500 font-black uppercase bg-yellow-600/5 p-4 rounded-xl border border-yellow-600/20 flex items-center gap-3">
                            <TrendingDown size={18} className="animate-pulse"/> 
                            <span className="leading-tight">PERINGATAN: TREN SETORAN IURAN MENURUN 3 BULAN BERUNTUN</span>
                          </div>
                        )}
                        {stats.trenMeningkat && !stats.isTerlambat && (
                          <div className="mt-2 text-[10px] text-green-500 font-black uppercase bg-green-600/5 p-4 rounded-xl border border-green-600/20 flex items-center gap-3 shadow-[0_0_15px_rgba(22,163,74,0.15)]">
                            <TrendingUp size={18} className="animate-pulse"/> 
                            <span className="leading-tight">PEMULIHAN: TREN SETORAN IURAN MENINGKAT 3 BULAN BERUNTUN</span>
                          </div>
                        )}
                      </div>

                      {/* Indikator Likuiditas */}
                      <div className="space-y-4">
                        <div className="flex justify-between text-[11px] uppercase font-black text-gray-500 tracking-[0.2em]">
                          <span>Rasio Kesehatan Dana</span>
                          <span className={stats.rasioKeuangan < 30 ? 'text-red-500' : 'text-[#FF6A00]'}>{stats.rasioKeuangan.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                          <div className={`h-full transition-all duration-1000 ${stats.rasioKeuangan < 30 ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'bg-[#FF6A00]'}`} style={{ width: `${stats.rasioKeuangan}%` }}></div>
                        </div>
                        <div className="mt-6 bg-[#0F0F0F] p-5 rounded-2xl border border-gray-800 shadow-inner">
                           <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-2">
                             <Info size={12}/> Hak Refund Terminasi:
                           </p>
                           <p className="text-xl font-black text-green-500 tracking-tight">Rp {stats.saldoRefund.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-800 flex justify-between items-center">
                      <span className={`px-5 py-2.5 border-2 rounded-xl text-[10px] font-black tracking-[0.3em] shadow-2xl ${statProd.bg} ${statProd.color}`}>
                        {statProd.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- 📋 TAB: REGISTRASI ENTITAS --- */}
        {activeTab === 'registrasi' && (
          <div className="max-w-xl mx-auto bg-black border border-gray-800 rounded-3xl p-12 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500">
             <div className="text-center mb-12 border-b border-gray-800 pb-10">
              <ShieldAlert size={56} className="text-[#FF6A00] mx-auto mb-6" />
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Registrasi Entitas Baru</h2>
              <p className="text-[11px] text-gray-500 mt-3 uppercase font-black tracking-[0.4em]">Pengesahan Administratif Anggota Lumbung</p>
              
              {/* Pesan Khusus Auditor */}
              {auth.role !== 'ADMIN_PUSAT' && (
                <div className="mt-4 inline-flex items-center gap-2 bg-red-600/10 text-red-500 border border-red-600/20 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <Lock size={12}/> Akses Pendaftaran Dikunci
                </div>
              )}
            </div>
            
            <form onSubmit={handleRegistrasi} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] text-gray-500 uppercase font-black tracking-[0.2em] ml-1">Identitas Organisasi Resmi</label>
                <input 
                  type="text" 
                  required 
                  disabled={auth.role !== 'ADMIN_PUSAT'}
                  placeholder="Contoh: HMPS Pendidikan IPA" 
                  value={formReg.namaHMPS} 
                  onChange={e => setFormReg({...formReg, namaHMPS: e.target.value})} 
                  className="w-full bg-[#0F0F0F] border border-gray-700 rounded-2xl p-6 text-sm focus:border-[#FF6A00] outline-none transition-all shadow-inner font-black disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 shadow-inner hover:border-gray-600 transition-colors">
                <label className="flex items-start gap-6 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    required 
                    disabled={auth.role !== 'ADMIN_PUSAT'}
                    checked={formReg.sepakatADART} 
                    onChange={e => setFormReg({...formReg, sepakatADART: e.target.checked})} 
                    className="mt-1 accent-[#FF6A00] h-7 w-7 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <div className="text-[12px] text-gray-400 text-justify leading-relaxed font-bold group-hover:text-gray-200 transition-colors">
                    Entitas HMPS menyatakan tunduk mutlak pada <strong className="text-white uppercase tracking-tighter">Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART)</strong>, bersedia diaudit secara transparan oleh sistem real-time, mematuhi batasan kuota bantuan, dan memahami prosedur terminasi yang mewajibkan pelunasan kewajiban demi melindungi Dana Mengendap Kolektif (40%).
                  </div>
                </label>
              </div>
              
              <button 
                type="submit" 
                disabled={auth.role !== 'ADMIN_PUSAT' || !formReg.sepakatADART}
                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] flex justify-center items-center gap-4 transition-all active:scale-95 shadow-2xl disabled:cursor-not-allowed ${formReg.sepakatADART && auth.role === 'ADMIN_PUSAT' ? 'bg-[#FF6A00] text-black hover:bg-orange-500' : 'bg-gray-800 text-gray-500'}`}
              >
                <CheckCircle size={24} /> SAHKAN KEANGGOTAAN
              </button>
            </form>
          </div>
        )}

        {/* --- 📜 TAB: PANDUAN & SOP (FULL NARRATIVE - DETAIL LENGKAP) --- */}
        {activeTab === 'panduan' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24">
            <div className="bg-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-gray-800 bg-gray-900/50 flex items-center gap-6">
                <BookMarked size={40} className="text-[#FF6A00]" />
                <h2 className="text-3xl font-black tracking-widest uppercase text-white">Pedoman Operasional & Standar Prosedur (SOP)</h2>
              </div>
              
              <div className="p-12 space-y-20 text-sm text-gray-300 leading-relaxed text-justify font-bold tracking-tight">
                
                {/* Bagian I: Tujuan */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 text-[#FF6A00] font-black uppercase tracking-widest text-[11px]">
                    <ShieldCheck size={24}/> I. Tujuan Utama dan Ruang Lingkup Sistem Terpadu
                  </div>
                  <div className="pl-6 border-l-4 border-gray-800 space-y-6">
                    <p>Sistem Digital Lumbung Bersama Mahasiswa dirancang sebagai instrumen tata kelola dana kolektif mahasiswa yang bersifat non-profit, berbasis asas solidaritas, keterbukaan, dan disiplin tinggi. Implementasi sistem ini bertujuan memastikan stabilitas dan ketahanan keuangan Himpunan Mahasiswa Program Studi (HMPS) di lingkungan Sekolah Tinggi Keguruan dan Ilmu Pendidikan (STKIP) Citra Bakti secara berkelanjutan.</p>
                    <p>Ruang lingkup sistem mencakup: Protokol registrasi entitas, mekanisme audit otomatis penyetoran iuran wajib bulanan (1%–2%), alokasi dana cadangan cadangan strategis, prosedur permohonan dan pencairan bantuan likuiditas, manajemen risiko krisis kolektif, hingga mekanisme pengunduran diri anggota (refund).</p>
                  </div>
                </section>

                {/* Bagian II: Struktur Dana */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 text-[#FF6A00] font-black uppercase tracking-widest text-[11px]">
                    <Scale size={24}/> II. Struktur Alokasi dan Klasifikasi Saldo (AD/ART Pasal 5)
                  </div>
                  <div className="pl-6 border-l-4 border-gray-800 space-y-8">
                    <p>Berdasarkan mandat Anggaran Rumah Tangga (ART) Pasal 5, sistem perangkat lunak secara otomatis mengklasifikasikan setiap nominal dana yang masuk ke dalam dua kategori akun struktural utama:</p>
                    <div className="grid md:grid-cols-2 gap-10">
                      <div className="border-2 border-red-600/30 bg-red-600/5 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 bg-red-600 text-white font-black px-4 py-1.5 text-[10px] tracking-widest">CADANGAN MATI</div>
                        <p className="font-black text-white text-sm uppercase mb-4 mt-4 tracking-tighter">DMM (Dana Mengendap Minimum) - 40%</p>
                        <p className="text-gray-400 text-[13px] leading-relaxed font-bold">Dana ini berfungsi murni sebagai jangkar cadangan stabilitas sistem. Berdasarkan hukum organisasi, DMM dilarang keras untuk dipergunakan sebagai bantuan likuiditas, pinjaman operasional, atau penarikan refund dalam kondisi apa pun guna menjamin eksistensi sistem lumbung di masa depan.</p>
                      </div>
                      <div className="border-2 border-green-600/30 bg-green-600/5 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 bg-green-600 text-white font-black px-4 py-1.5 text-[10px] tracking-widest">DANA SIRKULASI</div>
                        <p className="font-black text-white text-sm uppercase mb-4 mt-4 tracking-tighter">DLK (Dana Likuid Kegiatan) - 60%</p>
                        <p className="text-gray-400 text-[13px] leading-relaxed font-bold">Merupakan komponen kas produktif yang dialokasikan khusus untuk pembiayaan program kerja organisasi (HMPS). Seluruh pengajuan dana bantuan maupun proses pengembalian hak iuran (refund) mutlak bersumber dari ketersediaan saldo di pos DLK ini.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bagian III: Proteksi Pinjaman */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 text-[#FF6A00] font-black uppercase tracking-widest text-[11px]">
                    <AlertOctagon size={24}/> III. Mekanisme Proteksi Saldo dan Filter Otoritas
                  </div>
                  <div className="pl-6 border-l-4 border-gray-800 space-y-6">
                    <p>Sistem ini dilengkapi dengan protokol "Auto-Denial" guna mencegah defisit kas (saldo minus) dan melindungi hak iuran anggota lain. Transaksi pinjaman atau bantuan akan dibatalkan otomatis oleh sistem jika:</p>
                    <ul className="list-decimal pl-6 space-y-5 text-gray-400 text-[12px] font-black italic">
                      <li>Nominal yang diajukan melampaui Plafon Maksimal Individu (Maksimal 200% dari riwayat akumulasi kontribusi entitas terkait).</li>
                      <li>Nominal yang diajukan melampaui ketersediaan Saldo Likuid (DLK 60%) di dalam kas besar pada saat pencatatan mutasi dilakukan.</li>
                      <li>Entitas HMPS pemohon terdeteksi memiliki status Sanksi Administratif (Keterlambatan pelunasan melampaui batas waktu 30 hari kalender).</li>
                    </ul>
                  </div>
                </section>

                {/* Bagian IV: Produktivitas */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 text-[#FF6A00] font-black uppercase tracking-widest text-[11px]">
                    <Activity size={24}/> IV. Standar Evaluasi Rapor dan Penilaian Produktivitas
                  </div>
                  <div className="pl-6 border-l-4 border-gray-800 space-y-6">
                    <p>Evaluasi otomatis dilakukan setiap menit berdasarkan indikator rasio keuangan dan kepatuhan administratif pelaporan:</p>
                    <div className="bg-gray-950 p-8 rounded-3xl border border-gray-800 space-y-8 shadow-inner">
                      <div>
                        <span className="text-green-500 font-black text-xs uppercase bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 shadow-lg tracking-widest">1. Kategori SEHAT (Rasio 60% – 75%):</span>
                        <p className="text-[13px] text-gray-500 pl-4 mt-4 leading-relaxed font-bold">Kondisi operasional yang dianggap ideal di mana organisasi memiliki disiplin kontribusi yang tinggi serta penggunaan kuota bantuan yang terukur secara administratif.</p>
                      </div>
                      <div>
                        <span className="text-yellow-500 font-black text-xs uppercase bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20 shadow-lg tracking-widest">2. Kategori WASPADA (Rasio 30% – 59%):</span>
                        <p className="text-[13px] text-gray-500 pl-4 mt-4 leading-relaxed font-bold">Peringatan sistemik yang mewajibkan pimpinan organisasi untuk menstabilkan kondisi arus kas internal guna menghindari defisit kuota bantuan. Penurunan setoran iuran 3 bulan berturut-turut otomatis memicu status Waspada.</p>
                      </div>
                      <div>
                        <span className="text-red-500 font-black text-xs uppercase bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 shadow-lg tracking-widest">3. Kategori BERMASALAH (Rasio &lt; 30%):</span>
                        <p className="text-[13px] text-gray-500 pl-4 mt-4 leading-relaxed font-bold">Kondisi kegagalan administratif atau finansial. Sistem akan melakukan penguncian (lock) terhadap otoritas akses pencairan bantuan sampai kondisi iuran diperbaiki. Penurunan setoran 6 bulan beruntun memicu peringatan terminasi.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bagian V: Refund */}
                <section className="space-y-8 bg-orange-600/5 p-10 rounded-3xl border-2 border-orange-600/10 shadow-2xl">
                  <div className="flex items-center gap-4 text-[#FF6A00] font-black uppercase tracking-widest text-[11px]">
                    <LogOut size={24}/> V. Protokol Terminasi (Pengunduran Diri) & Hak Refund Anggota
                  </div>
                  <div className="space-y-6">
                    <p className="text-gray-300 font-black uppercase tracking-tight">Sesuai SOP Manajemen Risiko Bagian C, pengunduran diri diatur sebagai berikut:</p>
                    <ol className="list-decimal pl-6 space-y-5 text-[12px] text-gray-400 font-bold leading-relaxed">
                      <li><strong className="text-white uppercase tracking-tighter">Validasi Kewajiban:</strong> Pengajuan terminasi hanya disetujui jika entitas telah melunasi seluruh kewajiban pinjaman berjalan (Saldo Hutang Nol Rupiah).</li>
                      <li><strong className="text-white uppercase tracking-tighter">Kalkulasi Kontribusi Nett:</strong> Nominal dana refund adalah jumlah akumulasi setoran iuran dikurangi total nominal dana bantuan yang pernah dicairkan selama masa keanggotaan aktif.</li>
                      <li><strong className="text-white uppercase tracking-tighter">Proteksi Kas Kolektif:</strong> Penarikan dana refund hanya diproses jika ketersediaan Dana Likuid (DLK) mencukupi, tanpa mengancam saldo Dana Mengendap (40%) milik bersama.</li>
                      <li><strong className="text-white uppercase tracking-tighter">Arsip Historis:</strong> Nama entitas akan dihapus dari dashboard pantauan, namun riwayat transaksi kas tetap tersimpan secara permanen dalam database sebagai dokumen audit organisasi.</li>
                    </ol>
                  </div>
                </section>

                {/* --- 🛠️ INSTRUMEN ADMINISTRATOR: MASTER RESET (DIPROTEKSI LOGIN) --- */}
                <section className="pt-16 border-t border-gray-800">
                  <div className={`border-2 p-12 rounded-3xl text-center shadow-[0_0_50px_rgba(220,38,38,0.15)] transition-all ${auth.role === 'ADMIN_PUSAT' ? 'bg-red-600/10 border-red-600/30 group hover:border-red-600/60' : 'bg-gray-900 border-gray-800 opacity-70'}`}>
                    <div className={`inline-flex p-5 rounded-full mb-6 shadow-inner ${auth.role === 'ADMIN_PUSAT' ? 'bg-red-600/20 text-red-500 group-hover:animate-spin-slow' : 'bg-gray-800 text-gray-500'}`}>
                      {auth.role === 'ADMIN_PUSAT' ? <RefreshCw size={32} /> : <Lock size={32} />}
                    </div>
                    <h4 className={`font-black uppercase text-base mb-3 tracking-[0.4em] ${auth.role === 'ADMIN_PUSAT' ? 'text-red-500' : 'text-gray-500'}`}>
                      Pusat Otoritas: Master Reset Sistem
                    </h4>
                    <p className="text-[12px] text-gray-500 mb-8 leading-relaxed font-bold uppercase tracking-widest max-w-2xl mx-auto">
                      {auth.role === 'ADMIN_PUSAT' 
                        ? <>Gunakan instrumen ini hanya setelah periode uji coba sistem selesai. <br/> Seluruh pendaftaran anggota, riwayat transaksi kas, dan rekapitulasi saldo akan <strong>DIHAPUS SECARA PERMANEN</strong> agar sistem siap untuk operasional resmi.</>
                        : "Instrumen ini dikunci. Anda login sebagai Auditor. Hanya Admin Pusat (Bendahara Umum) yang memiliki kewenangan menghapus database."
                      }
                    </p>
                    <button 
                      onClick={handleMasterReset} 
                      disabled={auth.role !== 'ADMIN_PUSAT'}
                      className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[11px] tracking-[0.3em] px-12 py-5 rounded-2xl shadow-2xl transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                      KOSONGKAN SELURUH PANGKALAN DATA (RESET TOTAL)
                    </button>
                  </div>
                </section>

                <div className="pt-16 border-t border-gray-800 text-center uppercase text-[10px] font-black tracking-[0.6em] text-gray-700">
                  Dokumen Otoritas Digital - BEM STKIP Citra Bakti - Periode 2026/2027
                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}