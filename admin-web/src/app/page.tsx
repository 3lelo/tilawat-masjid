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
  Folder as FolderIcon,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  LogOut,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  FileAudio,
  Plus,
  RotateCw,
  Loader2,
  Layers,
  Filter,
  X,
  Info,
  Phone,
  Facebook,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'audio' | 'folders' | 'reels'>('audio');
  const [userEmail, setUserEmail] = useState<string>('مدير المسجد');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [selectedFolderFilterId, setSelectedFolderFilterId] = useState<string | null>(null);
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
  const [retryingPipelineId, setRetryingPipelineId] = useState<string | null>(null);

  // Diagnostics log modal state
  const [diagnosticsModal, setDiagnosticsModal] = useState<{
    open: boolean;
    title: string;
    details: any;
  }>({
    open: false,
    title: '',
    details: null,
  });

  // Reels state
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelUrl, setReelUrl] = useState<string>('');
  const [reelTitle, setReelTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auth and data initialization
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndInit() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user && !isDemoMode) {
          router.replace('/login');
          return;
        }

        if (session?.user && !isDemoMode) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role !== 'admin') {
            await supabase.auth.signOut();
            router.replace('/login');
            return;
          }
        }

        if (!isMounted) return;

        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }

        setIsAuthChecking(false);
        await loadData();
      } catch (err) {
        console.error('Auth verification error:', err);
        if (isMounted) {
          router.replace('/login');
        }
      }
    }

    checkAuthAndInit();

    // Real-time listener for audio file status updates (processing -> ready / failed)
    const channel = supabase
      .channel('audio_files_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audio_files' }, () => {
        loadAudioFiles();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    await Promise.all([loadFolders(), loadAudioFiles(), loadReels()]);
    setDataLoading(false);
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
        // Auto-expand all folders by default so nested children are visible
        setExpandedFolderIds(new Set(data.map((f: Folder) => f.id)));
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
    router.replace('/login');
  };

  // 1. Folder Tree Hierarchy Helpers
  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getSubfolders = (parentId: string | null): Folder[] => {
    return folders.filter((f) => {
      if (parentId === null) {
        return !f.parent_id;
      }
      return f.parent_id === parentId;
    });
  };

  // Get all descendant folder IDs (recursive) for subtree matching
  const getAllDescendantFolderIds = (folderId: string): string[] => {
    const directChildren = folders.filter((f) => f.parent_id === folderId);
    let ids: string[] = [folderId];
    for (const child of directChildren) {
      ids = ids.concat(getAllDescendantFolderIds(child.id));
    }
    return ids;
  };

  // Recursive count of audio files including direct files and all nested children
  const getSubtreeFilesCount = (folderId: string): { total: number; direct: number; hasChildren: boolean } => {
    const direct = audioFiles.filter((a) => a.folder_id === folderId).length;
    const descendantIds = getAllDescendantFolderIds(folderId);
    const total = audioFiles.filter((a) => descendantIds.includes(a.folder_id)).length;
    const directChildren = folders.filter((f) => f.parent_id === folderId);
    return {
      total,
      direct,
      hasChildren: directChildren.length > 0,
    };
  };

  // Build folder select options with indented hierarchy
  const getIndentedFolderOptions = (): { folder: Folder; depth: number }[] => {
    const result: { folder: Folder; depth: number }[] = [];
    const traverse = (parentId: string | null, depth: number) => {
      const children = getSubfolders(parentId);
      for (const child of children) {
        result.push({ folder: child, depth });
        traverse(child.id, depth + 1);
      }
    };
    traverse(null, 0);
    return result;
  };

  // 2. Folder Actions
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
    const subtreeCount = getSubtreeFilesCount(folder.id);
    const hasSub = folders.some((f) => f.parent_id === folder.id);

    if (subtreeCount.total > 0 || hasSub) {
      const confirmed = window.confirm(
        `تنبيه هام: المجلد "${folder.name}" يحتوي على ${subtreeCount.total} تلاوة أو مجلدات فرعية! هل أنت متأكد تماماً من حذفه وحذف جميع محتوياته؟`
      );
      if (!confirmed) return;
    } else {
      if (!window.confirm(`هل أنت متأكد من حذف المجلد "${folder.name}"؟`)) return;
    }

    try {
      const { error } = await supabase.from('folders').delete().eq('id', folder.id);
      if (error) throw error;
      if (selectedFolderFilterId === folder.id) {
        setSelectedFolderFilterId(null);
      }
      await loadFolders();
      await loadAudioFiles();
    } catch (err: any) {
      alert(`خطأ في حذف المجلد: ${err.message}`);
    }
  };

  // 3. Audio File Direct Upload to R2 and Pipeline Trigger
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!uploadTitle) {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const triggerConversionPipeline = async (fileId: string, token: string) => {
    const pipelineRes = await fetch('/api/upload/trigger-pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileId }),
    });

    const pipelineData = await pipelineRes.json();
    return { ok: pipelineRes.ok, data: pipelineData };
  };

  const handleManualRetryPipeline = async (audio: AudioFile) => {
    setRetryingPipelineId(audio.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const { ok, data } = await triggerConversionPipeline(audio.id, token);
      
      setDiagnosticsModal({
        open: true,
        title: ok ? 'تقرير إطلاق المعالجة السحابية' : 'تنبيه: فشل إطلاق المعالجة',
        details: data,
      });

      await loadAudioFiles();
    } catch (err: any) {
      setDiagnosticsModal({
        open: true,
        title: 'خطأ غير متوقع',
        details: { message: err.message, stack: err.stack },
      });
    } finally {
      setRetryingPipelineId(null);
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

      const fileId = crypto.randomUUID();

      // 1. Get presigned upload URL
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

      const { ok, data } = await triggerConversionPipeline(fileId, token);

      setUploadProgress(100);
      if (ok && data.success) {
        setUploadMessage('تم الرفع وإطلاق المعالجة بنجاح! سيتحول الملف إلى "جاهز" فور اكتمال الضغط.');
      } else {
        setUploadMessage('تم الرفع. اضغط زر "عرض التقرير / التشخيص" لفحص حالة سير العمل.');
        setDiagnosticsModal({
          open: true,
          title: 'تقرير إطلاق خط أنابيب المعالجة',
          details: data,
        });
      }

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
    const isProcessing = audio.status === 'processing';
    const warningText = isProcessing
      ? `التسجيل "${audio.title}" لا يزال قيد المعالجة. هل أنت متأكد من حذفه؟ سيتم حذف بياناته وإلغاء وتنظيف الملفات المرفوعة بالكامل من التخزين السحابي Cloudflare R2.`
      : `هل أنت متأكد من حذف تسجيل "${audio.title}"؟ سيتم حذف الملف نهائياً من قاعدة البيانات ومن Cloudflare R2.`;

    if (!window.confirm(warningText)) return;

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

  // 4. Reels Management
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

  // Recursive Tree Node Renderer
  const renderFolderTreeNode = (folder: Folder, depth: number = 0) => {
    const children = getSubfolders(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolderIds.has(folder.id);
    const countInfo = getSubtreeFilesCount(folder.id);
    const isSelected = selectedFolderFilterId === folder.id;

    return (
      <div key={folder.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-light)',
            background: isSelected
              ? 'var(--surface-secondary)'
              : depth === 0
              ? 'var(--surface-color)'
              : 'rgba(238, 243, 234, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginRight: `${depth * 24}px`,
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          {/* Hierarchy Guide Line */}
          {depth > 0 && (
            <div
              style={{
                position: 'absolute',
                right: '-16px',
                top: '50%',
                width: '14px',
                height: '1px',
                backgroundColor: 'var(--border-color)',
              }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleFolderExpand(folder.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--primary-color)',
                }}
                title={isExpanded ? 'طي المجلد الفرعي' : 'توسيع المجلد الفرعي'}
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
              </button>
            ) : (
              <span style={{ width: '18px', display: 'inline-block' }} />
            )}

            <div
              onClick={() => {
                // Open folder to see files inside
                setSelectedFolderFilterId(isSelected ? null : folder.id);
                setActiveTab('audio');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                cursor: 'pointer',
                flex: 1,
              }}
              title="اضغط لفتح المجلد وتصفح التلاوات الموجودة داخله"
            >
              <span style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <FolderOpen size={18} /> : <FolderIcon size={18} />}
              </span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                {folder.name}
              </span>
              {folder.type === 'year_month' && (
                <span className="badge badge-processing" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  سنة مرتبة بالأشهر
                </span>
              )}
              {/* Hierarchical Total Count Display */}
              <span
                style={{
                  fontSize: '12px',
                  color: countInfo.total > 0 ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontWeight: countInfo.total > 0 ? 600 : 400,
                  backgroundColor: 'var(--surface-color)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                }}
                title={
                  countInfo.hasChildren
                    ? `إجمالي ${countInfo.total} تلاوة (${countInfo.direct} مباشرة + ${countInfo.total - countInfo.direct} في المجلدات الفرعية)`
                    : `${countInfo.direct} تلاوة مباشرة`
                }
              >
                {countInfo.hasChildren
                  ? `${countInfo.total} تلاوة شاملة`
                  : `${countInfo.direct} تلاوة`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setSelectedFolderFilterId(isSelected ? null : folder.id);
                setActiveTab('audio');
              }}
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
              title="عرض التلاوات داخل هذا المجلد"
            >
              <FileAudio size={14} />
              <span>تصفح</span>
            </button>

            <button
              onClick={() => handleDeleteFolder(folder)}
              className="btn btn-danger"
              style={{ minHeight: '32px', padding: '4px 8px' }}
              title="حذف المجلد"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Render nested children if expanded */}
        {hasChildren && isExpanded && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '6px',
              borderRight: '2px dashed var(--border-color)',
              marginRight: `${depth * 24 + 10}px`,
              paddingRight: '6px',
            }}
          >
            {children.map((child) => renderFolderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Prevent ANY dashboard content from rendering until authentication is fully verified
  if (isAuthChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-color)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            backgroundColor: 'var(--surface-secondary)',
            color: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileAudio size={28} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader2 size={24} className="spinner" color="var(--primary-color)" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            جاري التحقق من صلاحيات المشرف...
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          لوحة تحكم تلاوات المسجد الكبير
        </p>
      </div>
    );
  }

  const rootFolders = getSubfolders(null);
  const folderOptions = getIndentedFolderOptions();

  // Filter audio files based on selected folder filter if active
  const filteredAudioFiles = selectedFolderFilterId
    ? (() => {
        const allowedIds = getAllDescendantFolderIds(selectedFolderFilterId);
        return audioFiles.filter((a) => allowedIds.includes(a.folder_id));
      })()
    : audioFiles;

  const selectedFolderObject = folders.find((f) => f.id === selectedFolderFilterId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-light)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              background: 'var(--surface-secondary)',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
      <div
        style={{
          background: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
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
                <span>رفع تسجيل جديد (صوت أو فيديو)</span>
              </h2>

              <form onSubmit={handleUploadSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="label">اختر الملف (MP3, M4A, WAV أو MP4 حتى ساعتين) *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/quicktime,video/*"
                    onChange={handleFileSelect}
                    className="input"
                    disabled={isUploading}
                    required
                  />
                  {selectedFile && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      الحجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت | النوع: {selectedFile.type || 'ملف وسائط'}
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">عنوان التسجيل أو التلاوة *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="مثال: سورة البقرة والرحمن"
                    className="input"
                    disabled={isUploading}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">الشيخ / القارئ *</label>
                  <input
                    type="text"
                    value={uploadSpeaker}
                    onChange={(e) => setUploadSpeaker(e.target.value)}
                    placeholder="مثال: الشيخ إبراهيم الحربي"
                    className="input"
                    disabled={isUploading}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">المجلد الوجهة *</label>
                  <select
                    value={uploadFolderId}
                    onChange={(e) => setUploadFolderId(e.target.value)}
                    className="select"
                    disabled={isUploading}
                    required
                  >
                    <option value="">-- اختر المجلد --</option>
                    {folderOptions.map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '↳ ' : ''}{folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="label">تاريخ التسجيل</label>
                  <input
                    type="date"
                    value={uploadRecordedAt}
                    onChange={(e) => setUploadRecordedAt(e.target.value)}
                    className="input"
                    disabled={isUploading}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="label">وصف إضافي (اختياري)</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="ملاحظات حول الصلاة أو التلاوة..."
                    className="textarea"
                    rows={3}
                    disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{uploadMessage}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          background: 'var(--primary-color)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={isUploading || folders.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>جاري الرفع والمعالجة...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      <span>بدء الرفع المباشر</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Audio Files List */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileAudio size={20} color="var(--primary-color)" />
                  <span>
                    التسجيلات المحفوظة ({filteredAudioFiles.length}
                    {selectedFolderFilterId ? ` من أصل ${audioFiles.length}` : ''})
                  </span>
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={loadAudioFiles}
                    className="btn btn-secondary"
                    style={{ minHeight: '34px', padding: '4px 10px', fontSize: '12px' }}
                  >
                    <RotateCw size={14} />
                    <span>تحديث</span>
                  </button>
                </div>
              </div>

              {/* Active Folder Filter Banner */}
              {selectedFolderFilterId && (
                <div
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={15} color="var(--primary-color)" />
                    <span>تصفية حسب المجلد: <strong>{selectedFolderObject?.name || 'مجلد مجهول'}</strong></span>
                  </div>
                  <button
                    onClick={() => setSelectedFolderFilterId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--danger-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <X size={14} />
                    <span>عرض كل التلاوات</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredAudioFiles.map((audio) => {
                  const folder = folders.find((f) => f.id === audio.folder_id);
                  const isRetrying = retryingPipelineId === audio.id;

                  return (
                    <div
                      key={audio.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
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

                        {audio.status === 'processing' && (
                          <p style={{ fontSize: '11px', color: 'var(--warning-color)', marginTop: '4px' }}>
                            يتم تحويل الملف وضغطه سحابياً بواسطة FFmpeg...
                          </p>
                        )}

                        {audio.error_message && (
                          <p style={{ fontSize: '12px', color: 'var(--danger-color)', marginTop: '4px' }}>
                            خطأ المعالجة: {audio.error_message}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(audio.status === 'processing' || audio.status === 'failed') && (
                          <button
                            onClick={() => handleManualRetryPipeline(audio)}
                            disabled={isRetrying}
                            className="btn btn-secondary"
                            style={{ minHeight: '36px', padding: '6px 10px', fontSize: '12px' }}
                            title="إعادة إطلاق المعالجة وفحص سجل التشخيص"
                          >
                            <RotateCw size={14} className={isRetrying ? 'spinner' : ''} />
                            <span>{isRetrying ? 'جاري الفحص...' : 'تشخيص ومعالجة'}</span>
                          </button>
                        )}

                        {audio.audio_url && audio.status === 'ready' && (
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

                {filteredAudioFiles.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    {selectedFolderFilterId
                      ? `لا توجد تلاوات في المجلد "${selectedFolderObject?.name}".`
                      : 'لا توجد تسجيلات بعد. يمكنك رفع تسجيل جديد من النموذج المقابل.'}
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
                    {folderOptions.map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '↳ ' : ''}{folder.name}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOpen size={20} color="var(--primary-color)" />
                  <span>شجرة المجلدات الهرمية ({folders.length})</span>
                </h2>
                {folders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (expandedFolderIds.size === folders.length) {
                        setExpandedFolderIds(new Set());
                      } else {
                        setExpandedFolderIds(new Set(folders.map((f) => f.id)));
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                  >
                    <Layers size={14} />
                    <span>{expandedFolderIds.size === folders.length ? 'طي الكل' : 'توسيع الكل'}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rootFolders.map((rootFolder) => renderFolderTreeNode(rootFolder, 0))}

                {folders.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
                    لا توجد مجلدات حالياً. يمكنك إنشاء مجلد جديد من النموذج المقابل.
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

      {/* Footer with Developer Credits */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          background: 'var(--surface-color)',
          padding: '16px 20px',
          marginTop: 'auto',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span>تلاوات المسجد الكبير • لوحة تحكم المشرف</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              تطوير: علي عدنان (Ali Adnan)
            </span>
            <a
              href="tel:+972595547471"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--primary-color)',
                textDecoration: 'none',
                fontWeight: 600,
                direction: 'ltr',
              }}
            >
              <Phone size={14} />
              <span>+972 595547471</span>
            </a>
            <a
              href="https://www.facebook.com/ali08adnan"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1877F2',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <Facebook size={14} />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Diagnostics / Pipeline Log Modal */}
      {diagnosticsModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} color="var(--primary-color)" />
                <span>{diagnosticsModal.title}</span>
              </h3>
              <button
                onClick={() => setDiagnosticsModal({ open: false, title: '', details: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              يمكنك نسخ هذا التقرير وتزويدي به لمعرفة سبب تعليق المعالجة بدقة:
            </p>

            <pre
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: '#1E293B',
                color: '#F8FAFC',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontFamily: 'monospace',
                direction: 'ltr',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(diagnosticsModal.details, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '8px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(diagnosticsModal.details, null, 2));
                  alert('تم نسخ التقرير إلى الحافظة!');
                }}
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '6px 14px' }}
              >
                نسخ التقرير
              </button>
              <button
                onClick={() => setDiagnosticsModal({ open: false, title: '', details: null })}
                className="btn btn-primary"
                style={{ minHeight: '36px', padding: '6px 14px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
