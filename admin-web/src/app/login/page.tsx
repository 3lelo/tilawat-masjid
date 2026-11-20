'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isDemoMode } from '@/lib/supabaseClient';
import { LogIn, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });
  }, []);

  const checkAdminRole = async (userId: string) => {
    if (isDemoMode) {
      router.push('/');
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setErrorMsg(`DB Error: ${error.message} (${error.code})`);
      return;
    }

    if (!profile) {
      setErrorMsg(`No profile row found in public.profiles for user ID: ${userId}`);
      await supabase.auth.signOut();
      return;
    }

    if (profile.role !== 'admin') {
      setErrorMsg(`Role is "${profile.role}", expected "admin".`);
      await supabase.auth.signOut();
      return;
    }

    router.push('/');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (isDemoMode) {
      // Demo access shortcut
      setTimeout(() => {
        router.push('/');
      }, 500);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل الدخول عبر Google');
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '35px',
          backgroundColor: 'var(--surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--primary-color)'
        }}>
          <LogIn size={32} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          لوحة تحكم تلاوات المسجد الكبير
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '22px' }}>
          تسجيل الدخول مخصص للمشرفين والمسؤولين عن نشر وإدارة المحتوى الصوتي والمرئي.
        </p>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-color)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '13px',
            textAlign: 'right'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '15px' }}
        >
          <LogIn size={18} />
          <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول بحساب Google'}</span>
        </button>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
          إذا كنت مسؤولاً جديداً، تأكد من ترقية دور حسابك إلى <code style={{ direction: 'ltr', display: 'inline-block' }}>admin</code> في لوحة Supabase كما هو موضح في دليل الإعداد.
        </p>
      </div>
    </main>
  );
}
