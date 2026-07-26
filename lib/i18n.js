'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'cv-lang';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'id'];

/**
 * Translation dictionaries.
 * Keep keys dot-namespaced by feature. New keys go here first, then referenced via t().
 */
export const dictionaries = {
  en: {
    common: {
      appName: 'CloudVault',
      loading: 'Loading...',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      save: 'Save',
      delete: 'Delete',
      download: 'Download',
      submit: 'Submit',
      back: 'Back',
      next: 'Next',
      logout: 'Logout',
      search: 'Search',
      refresh: 'Refresh',
      retry: 'Retry',
      error: 'Error',
      success: 'Success',
      required: 'Required',
      optional: 'Optional',
      yes: 'Yes',
      no: 'No',
    },
    lang: {
      switcher: 'Language',
      en: 'English',
      id: 'Indonesian',
    },
    auth: {
      loginTitle: 'Sign In',
      registerTitle: 'Create Account',
      loginTab: 'Sign In',
      registerTab: 'Sign Up',
      username: 'Username',
      password: 'Password',
      usernamePlaceholder: 'Choose a username',
      passwordPlaceholder: 'Enter password',
      usernameHint: 'At least 3 characters',
      passwordHint: 'At least 4 characters',
      captchaLabel: 'Verify: solve the equation',
      captchaPlaceholder: 'Answer',
      captchaRefresh: 'Refresh',
      loginBtn: 'Sign In',
      registerBtn: 'Create Account',
      loginLoading: 'Signing in...',
      registerLoading: 'Creating account...',
      forgotLink: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      securityQuestionsTitle: 'Security Questions',
      securityQuestionsHint: 'Used to recover your account. Answers are hashed, we cannot read them.',
      question: 'Question',
      answer: 'Answer',
      addQuestion: 'Add another question',
      removeQuestion: 'Remove',
      selectQuestion: 'Choose a question',
      forgotTitle: 'Reset Password',
      forgotStep1: 'Enter your username',
      forgotStep2: 'Answer your security questions',
      forgotStep3: 'Set new password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      resetSuccess: 'Password reset. Please sign in.',
      backToLogin: 'Back to sign in',
    },
    header: {
      files: 'Files',
      used: 'Used',
      syncing: 'Syncing',
      synced: 'Synced',
    },
    upload: {
      dropzoneTitle: 'Drop files here',
      dropzoneSubtitle: 'or click to browse',
      dropzoneHint: 'Files under {size} go to Telegram, larger ones to Discord',
      quickTitle: 'Quick Upload',
      quickHint: 'Tap to pick files from your device',
      iosNote: 'iOS users: use Files app to select documents',
      preparing: 'Preparing "{name}"',
      routing: 'Routing to {backend}...',
      uploadingChunk: 'Uploading chunk {index}/{total}...',
      rateLimited: 'Rate limited, waiting {seconds}s...',
      chunkDone: 'Chunk {index}/{total} \u2713',
      finalizing: 'Finalizing...',
      done: 'Done! \u2192 {backend}',
      successTitle: 'Upload Complete',
      successFile: 'File',
      successSize: 'Size',
      successStorage: 'Storage',
      successNotice: 'File is available in your dashboard immediately.',
      failed: 'Upload failed: {error}',
      thumbGenerating: 'Generating video preview...',
    },
    dashboard: {
      searchPlaceholder: 'Search files...',
      filterAll: 'All',
      filterDiscord: 'Discord',
      filterTelegram: 'Telegram',
      viewGallery: 'Gallery view',
      viewList: 'List view',
      colName: 'Name',
      colSize: 'Size',
      colType: 'Type',
      colDate: 'Date',
      empty: 'No files yet',
      emptyHint: 'Upload something to get started',
      loading: 'Loading files...',
      loadFailed: 'Failed to load files. Try refreshing.',
      pagePrev: 'Previous',
      pageNext: 'Next',
      pageOf: 'Page {current} of {total}',
      syncInfo: 'Dashboard syncs every ~5 minutes',
      deleteConfirmTitle: 'Delete File',
      deleteConfirmText: 'This will permanently remove "{name}". Continue?',
      deleted: 'Deleted!',
      deleteFailed: 'Delete failed',
      downloadTitle: 'Downloading',
      downloadComplete: 'Download Complete',
      downloadFailed: 'Download failed: {error}',
      previewTitle: 'Preview',
      previewUnsupported: 'Preview not available for this file type',
    },
    install: {
      title: 'Install CloudVault',
      subtitle: 'Add to your home screen for quick access',
      installBtn: 'Install',
      dismissBtn: 'Not now',
    },
    share: {
      title: 'Quick Upload',
      subtitle: 'Share files from other apps to CloudVault',
      loginPrompt: 'Sign in first to upload shared files',
      dropzone: 'Drop or select files',
      selectFiles: 'Select Files',
      uploadAll: 'Upload All',
      uploading: 'Uploading...',
      allDone: 'All files uploaded',
      goToDashboard: 'Go to dashboard',
    },
    donate: {
      title: 'Support CloudVault',
      subtitle: 'Free forever. Your donation keeps it running.',
      cta: 'Donate via Trakteer',
      empty: 'No supporters yet. Be the first!',
      total: 'Total supporters',
    },
    footer: {
      tagline: 'Discord & Telegram Storage',
      security: 'End-to-end HTTPS \u2022 Passwords bcrypt-hashed',
      openSource: 'Free forever',
    },
    trust: {
      https: 'HTTPS encrypted',
      bcrypt: 'Passwords bcrypt-hashed',
      noTracking: 'No trackers, no ads',
    },
    errors: {
      generic: 'Something went wrong',
      network: 'Network error. Check your connection.',
      unauthorized: 'Please sign in',
      forbidden: 'You do not have access',
      notFound: 'Not found',
      tooManyRequests: 'Too many requests. Try again later.',
    },
  },
  id: {
    common: {
      appName: 'CloudVault',
      loading: 'Memuat...',
      cancel: 'Batal',
      confirm: 'Konfirmasi',
      close: 'Tutup',
      save: 'Simpan',
      delete: 'Hapus',
      download: 'Unduh',
      submit: 'Kirim',
      back: 'Kembali',
      next: 'Lanjut',
      logout: 'Keluar',
      search: 'Cari',
      refresh: 'Muat ulang',
      retry: 'Coba lagi',
      error: 'Error',
      success: 'Berhasil',
      required: 'Wajib',
      optional: 'Opsional',
      yes: 'Ya',
      no: 'Tidak',
    },
    lang: {
      switcher: 'Bahasa',
      en: 'Inggris',
      id: 'Indonesia',
    },
    auth: {
      loginTitle: 'Masuk',
      registerTitle: 'Buat Akun',
      loginTab: 'Masuk',
      registerTab: 'Daftar',
      username: 'Username',
      password: 'Password',
      usernamePlaceholder: 'Pilih username',
      passwordPlaceholder: 'Masukkan password',
      usernameHint: 'Minimal 3 karakter',
      passwordHint: 'Minimal 4 karakter',
      captchaLabel: 'Verifikasi: selesaikan soal',
      captchaPlaceholder: 'Jawaban',
      captchaRefresh: 'Refresh',
      loginBtn: 'Masuk',
      registerBtn: 'Buat Akun',
      loginLoading: 'Masuk...',
      registerLoading: 'Membuat akun...',
      forgotLink: 'Lupa password?',
      noAccount: 'Belum punya akun?',
      hasAccount: 'Sudah punya akun?',
      securityQuestionsTitle: 'Pertanyaan Keamanan',
      securityQuestionsHint: 'Dipakai untuk memulihkan akun. Jawaban di-hash, kami tidak bisa membacanya.',
      question: 'Pertanyaan',
      answer: 'Jawaban',
      addQuestion: 'Tambah pertanyaan',
      removeQuestion: 'Hapus',
      selectQuestion: 'Pilih pertanyaan',
      forgotTitle: 'Reset Password',
      forgotStep1: 'Masukkan username kamu',
      forgotStep2: 'Jawab pertanyaan keamanan',
      forgotStep3: 'Buat password baru',
      newPassword: 'Password Baru',
      confirmPassword: 'Konfirmasi Password',
      resetSuccess: 'Password berhasil direset. Silakan masuk.',
      backToLogin: 'Kembali ke login',
    },
    header: {
      files: 'File',
      used: 'Terpakai',
      syncing: 'Sinkronisasi',
      synced: 'Tersinkron',
    },
    upload: {
      dropzoneTitle: 'Drop file di sini',
      dropzoneSubtitle: 'atau klik untuk pilih',
      dropzoneHint: 'File di bawah {size} ke Telegram, lebih besar ke Discord',
      quickTitle: 'Upload Cepat',
      quickHint: 'Tap untuk pilih file dari device',
      iosNote: 'Pengguna iOS: gunakan app Files untuk pilih dokumen',
      preparing: 'Menyiapkan "{name}"',
      routing: 'Mengirim ke {backend}...',
      uploadingChunk: 'Upload chunk {index}/{total}...',
      rateLimited: 'Rate limited, tunggu {seconds}d...',
      chunkDone: 'Chunk {index}/{total} \u2713',
      finalizing: 'Finalisasi...',
      done: 'Selesai! \u2192 {backend}',
      successTitle: 'Upload Berhasil',
      successFile: 'File',
      successSize: 'Ukuran',
      successStorage: 'Penyimpanan',
      successNotice: 'File langsung tersedia di dashboard.',
      failed: 'Upload gagal: {error}',
      thumbGenerating: 'Membuat preview video...',
    },
    dashboard: {
      searchPlaceholder: 'Cari file...',
      filterAll: 'Semua',
      filterDiscord: 'Discord',
      filterTelegram: 'Telegram',
      viewGallery: 'Tampilan galeri',
      viewList: 'Tampilan daftar',
      colName: 'Nama',
      colSize: 'Ukuran',
      colType: 'Tipe',
      colDate: 'Tanggal',
      empty: 'Belum ada file',
      emptyHint: 'Upload sesuatu untuk mulai',
      loading: 'Memuat file...',
      loadFailed: 'Gagal memuat file. Coba refresh.',
      pagePrev: 'Sebelumnya',
      pageNext: 'Berikutnya',
      pageOf: 'Halaman {current} dari {total}',
      syncInfo: 'Dashboard sinkron setiap ~5 menit',
      deleteConfirmTitle: 'Hapus File',
      deleteConfirmText: 'File "{name}" akan dihapus permanen. Lanjutkan?',
      deleted: 'Terhapus!',
      deleteFailed: 'Gagal menghapus',
      downloadTitle: 'Mengunduh',
      downloadComplete: 'Unduh Selesai',
      downloadFailed: 'Unduh gagal: {error}',
      previewTitle: 'Pratinjau',
      previewUnsupported: 'Pratinjau tidak tersedia untuk tipe file ini',
    },
    install: {
      title: 'Install CloudVault',
      subtitle: 'Tambahkan ke home screen untuk akses cepat',
      installBtn: 'Install',
      dismissBtn: 'Nanti saja',
    },
    share: {
      title: 'Upload Cepat',
      subtitle: 'Bagikan file dari app lain ke CloudVault',
      loginPrompt: 'Masuk dulu untuk upload file',
      dropzone: 'Drop atau pilih file',
      selectFiles: 'Pilih File',
      uploadAll: 'Upload Semua',
      uploading: 'Mengupload...',
      allDone: 'Semua file terupload',
      goToDashboard: 'Ke dashboard',
    },
    donate: {
      title: 'Dukung CloudVault',
      subtitle: 'Gratis selamanya. Donasi kamu bikin tetap jalan.',
      cta: 'Donasi via Trakteer',
      empty: 'Belum ada supporter. Jadilah yang pertama!',
      total: 'Total supporter',
    },
    footer: {
      tagline: 'Penyimpanan Discord & Telegram',
      security: 'HTTPS terenkripsi \u2022 Password di-hash bcrypt',
      openSource: 'Gratis selamanya',
    },
    trust: {
      https: 'HTTPS terenkripsi',
      bcrypt: 'Password di-hash bcrypt',
      noTracking: 'Tanpa tracker, tanpa iklan',
    },
    errors: {
      generic: 'Terjadi kesalahan',
      network: 'Error jaringan. Cek koneksi kamu.',
      unauthorized: 'Silakan masuk',
      forbidden: 'Kamu tidak punya akses',
      notFound: 'Tidak ditemukan',
      tooManyRequests: 'Terlalu banyak request. Coba lagi nanti.',
    },
  },
};

/**
 * Look up a dot-path key in the current language dictionary.
 * Falls back to English then to the key itself if missing.
 */
function lookup(lang, key) {
  const paths = key.split('.');
  for (const source of [dictionaries[lang], dictionaries[DEFAULT_LANG]]) {
    let cursor = source;
    let found = true;
    for (const p of paths) {
      if (cursor && typeof cursor === 'object' && p in cursor) {
        cursor = cursor[p];
      } else {
        found = false;
        break;
      }
    }
    if (found && typeof cursor === 'string') return cursor;
  }
  return key;
}

/**
 * Interpolate {name} placeholders in a template using vars object.
 */
function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const LangContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored && SUPPORTED.includes(stored)) {
        setLangState(stored);
      }
    } catch {
      // Silently ignore storage errors (private mode, etc.)
    }
  }, []);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Silently ignore storage errors
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  const t = useCallback((key, vars) => interpolate(lookup(lang, key), vars), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LangContext);
}

export const SUPPORTED_LANGS = SUPPORTED;
