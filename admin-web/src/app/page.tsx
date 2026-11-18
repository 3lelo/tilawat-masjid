'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isDemoMode } from '@/lib/supabaseClient';
import { Folder, AudioFile, Reel } from '@/lib/types';
import {
  FolderPlus,
  UploadCloud,
  Film,
  FolderOpen,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  AlertTriangle,
  LogOut,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Play,
  FileAudio,
  Plus,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'audio' | 'folders' | 'reels'>('audio');
  const [userEmail, setUserEmail] = useState<string>('مدير المسجد');
  const [loading, setLoading] = useState<boolean>(true);

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderType, setNewFolderType] = useState<'normal' | 'year_month'>('normal');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');

  // Audio files state
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadSpeaker, setUploadSpeaker] = useState<string>('');
  const [uploadRecordedAt, setUploadRecordedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadFolderId, setUploadFolderId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Reels state
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelUrl, setReelUrl] = useState<string>('');
  const [reelTitle, setReelTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auth and data initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user && !isDemoMode) {
        router.push('/login');
        return;
      }
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
      loadData();
    });

    // Real-time listener for audio file status updates (processing -> ready)
    const channel = supabase
      .channel('audio_files_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audio_files' }, () => {
        loadAudioFiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFolders(), loadAudioFiles(), loadReels()]);
    setLoading(false);
  };

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        setFolders(data as Folder[]);
        if (!uploadFolderId && data.length > 0) {
          setUploadFolderId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error loading folders:', err);
    }
  };

  const loadAudioFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAudioFiles(data as AudioFile[]);
      }
    } catch (err) {
      console.warn('Error loading audio files:', err);
    }
  };

  const loadReels = async () => {
    try {
      const { data, error } = await supabase
        .from('reels')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReels(data as Reel[]);
      }
    } catch (err) {
      console.warn('Error loading reels:', err);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 1. Folder Management Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const parentId = newFolderParentId || null;
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim(),
        parent_id: parentId,
        type: newFolderType,
        sort_order: folders.length + 1,
      });

      if (error) throw error;

      setNewFolderName('');
      setNewFolderType('normal');
      setNewFolderParentId('');
      await loadFolders();
      alert('تم إنشاء المجلد بنجاح.');
    } catch (err: any) {
      alert(`خطأ في إنشاء المجلد: ${err.message}`);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const hasFiles = audioFiles.some((a) => a.folder_id === folder.id);
    const hasSub = folders.some((f) => f.parent_id === folder.id);

    if (hasFiles || hasSub) {
      const confirmed = window.confirm(
        `تنبيه هام: المجلد "${folder.name}" يحتوي على تلاوات أو مجلدات فرعية! هل أنت متأكد تماماً من حذفه وحذف جميع محتوياته؟`
      );
      if (!confirmed) return;
    } else {
      if (!window.confirm(`هل أنت متأكد من حذف المجلد "${folder.name}"؟`)) return;
    }

    try {
      const { error } = await supabase.from('folders').delete().eq('id', folder.id);
      if (error) throw error;
      await loadFolders();
      await loadAudioFiles();
    } catch (err: any) {
      alert(`خطأ في حذف المجلد: ${err.message}`);
    }
  };

  // 2. Audio File Direct Upload to R2 and Pipeline Trigger
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!uploadTitle) {
        // Auto-fill title from filename without extension
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('يرجى اختيار ملف صوتي أو مرئي للرفع.');
      return;
    }
    if (!uploadTitle.trim() || !uploadSpeaker.trim() || !uploadFolderId) {
      alert('يرجى ملء جميع الحقول المطلوبة (العنوان، الشيخ، والمجلد).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadMessage('جاري تهيئة الرفع إلى Cloudflare R2...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // Generate a new UUID for the audio_files record
      const fileId = crypto.randomUUID();

      // 1. Get presigned upload URL from Vercel API
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileId,
          filename: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      if (!presignRes.ok) {
        const errData = await presignRes.json();
        throw new Error(errData.error || 'فشل في توليد رابط الرفع المباشر');
      }

      const { presignedUrl } = await presignRes.json();

      // 2. Direct upload to Cloudflare R2 via XMLHttpRequest to track progress
      setUploadMessage('جاري رفع الملف إلى التخزين السحابي...');
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 80) + 10;
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error(`فشل رفع الملف إلى السحابة (رمز: ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('خطأ في شبكة الاتصال أثناء الرفع'));
        xhr.send(selectedFile);
      });

      // 3. Create audio_files record in Supabase with status = 'processing'
      setUploadProgress(92);
      setUploadMessage('جاري تسجيل الملف وتحديث قاعدة البيانات...');

      const { error: dbError } = await supabase.from('audio_files').insert({
        id: fileId,
        folder_id: uploadFolderId,
        title: uploadTitle.trim(),
        speaker: uploadSpeaker.trim(),
        description: uploadDescription.trim() || null,
        recorded_at: uploadRecordedAt,
        status: 'processing',
        audio_url: '',
        duration_seconds: 0,
        size_bytes: selectedFile.size,
      });

      if (dbError) throw dbError;

      // 4. Trigger GitHub Actions conversion workflow
      setUploadProgress(98);
      setUploadMessage('جاري إطلاق سير عمل التحويل التلقائي (FFmpeg)...');

      await fetch('/api/upload/trigger-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId }),
      });

      setUploadProgress(100);
      setUploadMessage('تم الرفع بنجاح! الملف قيد المعالجة السحابية الآن وسيكون جاهزاً تلقائياً.');

      // Reset form
      setSelectedFile(null);
      setUploadTitle('');
      setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadAudioFiles();
    } catch (err: any) {
      console.error(err);
      alert(`خطأ أثناء الرفع: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAudio = async (audio: AudioFile) => {
    if (!window.confirm(`هل أنت متأكد من حذف تسجيل "${audio.title}"؟ سيتم حذف الملف أيضاً من Cloudflare R2.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/audio/${audio.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل حذف الملف');
      }

      await loadAudioFiles();
    } catch (err: any) {
      alert(`خطأ في الحذف: ${err.message}`);
    }
  };

  // 3. Reels Management
  const detectPlatform = (url: string): 'youtube' | 'instagram' | 'facebook' | 'tiktok' => {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('tiktok.com')) return 'tiktok';
    return 'facebook';
  };

  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelUrl.trim()) return;

    try {
      const platform = detectPlatform(reelUrl.trim());
      const { error } = await supabase.from('reels').insert({
        url: reelUrl.trim(),
        platform,
        title: reelTitle.trim() || null,
        sort_order: reels.length + 1,
      });

      if (error) throw error;

      setReelUrl('');
      setReelTitle('');
      await loadReels();
      alert('تمت إضافة المقطع القصير بنجاح.');
    } catch (err: any) {
      alert(`خطأ في إضافة المقطع: ${err.message}`);
    }
  };

  const handleDeleteReel = async (reel: Reel) => {
    if (!window.confirm('هل تريد حذف هذا المقطع؟')) return;
    try {
      const { error } = await supabase.from('reels').delete().eq('id', reel.id);
      if (error) throw error;
      await loadReels();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{
        background: 'var(--surface-color)',
        borderBottom: '1px solid var(--border-light)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '20px',
            background: 'var(--surface-secondary)',
            color: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileAudio size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700 }}>لوحة إدارة تلاوات المسجد الكبير</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userEmail}</p>
          </div>
        </div>

        <button onClick={handleSignOut} className="btn btn-secondary" style={{ minHeight: '40px', padding: '8px 14px' }}>
          <LogOut size={16} />
          <span>خروج</span>
        </button>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        background: 'var(--surface-color)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 20px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('audio')}
          style={{
            padding: '14px 20px',
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            borderBottom: activeTab === 'audio' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'audio' ? 'var(--primary-color)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <UploadCloud size={18} />
          <span>التسجيلات والرفع</span>
          <span className="badge badge-ready">{audioFiles.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('folders')}
          style={{
            padding: '14px 20px',
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            borderBottom: activeTab === 'folders' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'folders' ? 'var(--primary-color)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FolderOpen size={18} />
          <span>شجرة المجلدات</span>
          <span className="badge badge-ready">{folders.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          style={{
            padding: '14px 20px',
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            borderBottom: activeTab === 'reels' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'reels' ? 'var(--primary-color)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Film size={18} />
          <span>المقاطع القصيرة (Reels)</span>
          <span className="badge badge-ready">{reels.length}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {/* TAB 1: AUDIO FILES & UPLOAD */}
        {activeTab === 'audio' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Upload Box */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} color="var(--primary-color)" />
                <span>رفع تسجيل صوتي أو مرئي جديد</span>
              </h2>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '20px' }}>
                الملفات المرفوعة (حتى ساعتين من الصوت أو الفيديو) تُحوّل تلقائياً في السحاب إلى صيغة صوتية خفيفة عالية النقاوة (48kbps AAC) بدون أي تدخل يدوي.
              </p>

              <form onSubmit={handleUploadSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="label">اختر الملف (صوت MP3/WAV/M4A أو فيديو MP4) *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileSelect}
                    className="input"
                    style={{ padding: '8px' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">عنوان التسجيل (السورة أو الموضوع) *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="مثال: سورة مريم كاملة - تلاوة خاشعة"
                    className="input"
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">اسم الشيخ أو القارئ *</label>
                  <input
                    type="text"
                    value={uploadSpeaker}
                    onChange={(e) => setUploadSpeaker(e.target.value)}
                    placeholder="مثال: الشيخ عبد الله بن محمد"
                    className="input"
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">المجلد الوجهة *</label>
                  <select
                    value={uploadFolderId}
                    onChange={(e) => setUploadFolderId(e.target.value)}
                    className="select"
                    required
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.type === 'year_month' ? '(سنة مرتبة بالأشهر)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">تاريخ التسجيل *</label>
                  <input
                    type="date"
                    value={uploadRecordedAt}
                    onChange={(e) => setUploadRecordedAt(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label className="label">وصف إضافي (اختياري)</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="ملاحظات حول صلاة الفجر، جودة التسجيل، إلخ..."
                    className="textarea"
                    rows={2}
                  />
                </div>

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>{uploadMessage}</span>
                      <span style={{ fontWeight: 700 }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <UploadCloud size={18} />
                  <span>{isUploading ? 'جاري الرفع والمعالجة...' : 'بدء الرفع المباشر'}</span>
                </button>
              </form>
            </div>

            {/* Audio Files List */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileAudio size={20} color="var(--primary-color)" />
                  <span>التسجيلات المرفوعة ({audioFiles.length})</span>
                </span>
                <button onClick={loadAudioFiles} className="btn btn-secondary" style={{ minHeight: '36px', padding: '4px 10px', fontSize: '12px' }}>
                  تحديث
                </button>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '650px', overflowY: 'auto' }}>
                {audioFiles.map((audio) => {
                  const folder = folders.find((f) => f.id === audio.folder_id);
                  return (
                    <div
                      key={audio.id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px' }}>{audio.title}</span>
                          {audio.status === 'ready' && <span className="badge badge-ready"><CheckCircle size={12} /> جاهز</span>}
                          {audio.status === 'processing' && <span className="badge badge-processing"><Clock size={12} /> قيد المعالجة</span>}
                          {audio.status === 'failed' && <span className="badge badge-failed"><AlertTriangle size={12} /> فشل</span>}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>الشيخ: {audio.speaker}</span>
                          <span>المجلد: {folder?.name || 'غير معروف'}</span>
                          <span>التاريخ: {audio.recorded_at}</span>
                          {audio.duration_seconds > 0 && <span>المدة: {Math.floor(audio.duration_seconds / 60)} دقيقة</span>}
                        </div>

                        {audio.error_message && (
                          <p style={{ fontSize: '12px', color: 'var(--danger-color)', marginTop: '4px' }}>
                            خطأ المعالجة: {audio.error_message}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {audio.audio_url && (
                          <a
                            href={audio.audio_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ minHeight: '36px', padding: '6px 10px' }}
                            title="استماع / فتح"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteAudio(audio)}
                          className="btn btn-danger"
                          style={{ minHeight: '36px', padding: '6px 10px' }}
                          title="حذف التسجيل"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {audioFiles.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    لا توجد تسجيلات بعد. يمكنك رفع تسجيل جديد من النموذج المقابل.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FOLDERS MANAGEMENT */}
        {activeTab === 'folders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Create Folder Form */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="var(--primary-color)" />
                <span>إنشاء مجلد جديد</span>
              </h2>

              <form onSubmit={handleCreateFolder}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="label">اسم المجلد *</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="مثال: الصلوات الجهرية، أو عام 2025"
                    className="input"
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">المجلد الأب (الموقع في الشجرة)</label>
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="select"
                  >
                    <option value="">مجلد رئيسي (Root Folder)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="label">نوع المجلد *</label>
                  <select
                    value={newFolderType}
                    onChange={(e) => setNewFolderType(e.target.value as any)}
                    className="select"
                  >
                    <option value="normal">عادي (يحتوي مجلدات فرعية وتلاوات)</option>
                    <option value="year_month">سنة (مرتبة تلقائياً بالأشهر)</option>
                  </select>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    مجلد السنة يرتب التلاوات تلقائياً حسب شهر التسجيل (يناير، فبراير، ...) من الأحدث إلى الأقدم.
                  </p>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <FolderPlus size={18} />
                  <span>إنشاء المجلد</span>
                </button>
              </form>
            </div>

            {/* Folders Tree View */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={20} color="var(--primary-color)" />
                <span>شجرة المجلدات الحالية ({folders.length})</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {folders.map((folder) => {
                  const parent = folders.find((f) => f.id === folder.parent_id);
                  const filesCount = audioFiles.filter((a) => a.folder_id === folder.id).length;

                  return (
                    <div
                      key={folder.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginRight: folder.parent_id ? '20px' : '0',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700 }}>{folder.name}</span>
                          {folder.type === 'year_month' && (
                            <span className="badge badge-processing">سنة مرتبة بالأشهر</span>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ({filesCount} تلاوة)
                          </span>
                        </div>
                        {parent && (
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            تابع لـ: {parent.name}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteFolder(folder)}
                        className="btn btn-danger"
                        style={{ minHeight: '34px', padding: '4px 8px' }}
                        title="حذف المجلد"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}

                {folders.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
                    لا توجد مجلدات حالياً.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REELS MANAGEMENT */}
        {activeTab === 'reels' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Add Reel Form */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={20} color="var(--primary-color)" />
                <span>إضافة مقطع قصير جديد (Reel)</span>
              </h2>

              <form onSubmit={handleAddReel}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="label">رابط المقطع (YouTube Shorts / TikTok / Instagram) *</label>
                  <input
                    type="url"
                    value={reelUrl}
                    onChange={(e) => setReelUrl(e.target.value)}
                    placeholder="https://www.youtube.com/shorts/..."
                    className="input"
                    required
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    يتم اكتشاف المنصة تلقائياً من الرابط.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="label">عنوان أو تعليق المقطع (اختياري)</label>
                  <input
                    type="text"
                    value={reelTitle}
                    onChange={(e) => setReelTitle(e.target.value)}
                    placeholder="مثال: تلاوة مؤثرة من سورة طه"
                    className="input"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={18} />
                  <span>إضافة المقطع</span>
                </button>
              </form>
            </div>

            {/* Current Reels List */}
            <div className="card">
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={20} color="var(--primary-color)" />
                <span>المقاطع المنشورة ({reels.length})</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px' }}>{reel.title || 'مقطع بدون عنوان'}</p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <span className="badge badge-ready">{reel.platform}</span>
                        <a
                          href={reel.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent-color)' }}
                        >
                          فتح الرابط
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReel(reel)}
                      className="btn btn-danger"
                      style={{ minHeight: '34px', padding: '4px 8px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {reels.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
                    لا توجد مقاطع قصيرة مضافة بعد.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
