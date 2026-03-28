"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DevotionalCard from '@/components/DevotionalCard';
import ReflectionFeed from '@/components/ReflectionFeed';
import Link from 'next/link';

export default function Home() {
  const { session, userProfile, isLoading } = useAuth();
  const router = useRouter();
  const [devotional, setDevotional] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    if (session) {
      fetchDevotional();
    }
  }, [session]);

  async function fetchDevotional() {
    const today = new Date().toISOString().split('T')[0];
    const { data: dev } = await supabase
      .from('devotionals')
      .select('*')
      .eq('publish_date', today)
      .single();
      
    const displayData = dev || (await supabase
      .from('devotionals')
      .select('*')
      .order('publish_date', { ascending: false })
      .limit(1)
      .single()).data;
      
    setDevotional(displayData);
  }

  if (isLoading || !session) {
    return <div className="bg-[#050505] min-h-[100dvh]" />;
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-[#050505] px-6 py-12 text-white overflow-x-hidden font-sans pb-40">
      {/* Top Nav */}
      <div className="absolute top-6 right-6 z-20">
        <Link 
          href="/profile" 
          className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full transition-colors shadow-lg"
        >
          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
            {userProfile?.username || 'Profile'}
          </span>
          {userProfile?.streak_count !== undefined && userProfile.streak_count > 0 && (
            <span className="text-[10px] text-orange-500">🔥{userProfile.streak_count}</span>
          )}
        </Link>
      </div>

      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px]" />

      {devotional ? (
        <>
          <DevotionalCard devotional={devotional} />
          <ReflectionFeed devotionalDate={devotional.publish_date} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Loading devotional...</p>
        </div>
      )}
    </main>
  );
}