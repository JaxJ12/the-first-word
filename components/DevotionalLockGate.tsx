"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import DevotionalCard from './DevotionalCard';

export default function DevotionalLockGate() {
  const { session, userProfile, isLoading, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [devotional, setDevotional] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session && !isLoading && needsToReflect()) {
      fetchDevotional();
    }
  }, [session, isLoading, userProfile]);

  function needsToReflect() {
    if (!session || !userProfile) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return userProfile.last_post_date !== todayStr;
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !userProfile || !devotional) return;
    
    const sanitizedComment = comment.trim();
    if (!sanitizedComment) return;

    setIsSubmitting(true);
    const todayStr = new Date().toISOString().split('T')[0];

    // Maintain streak logic
    let newStreak = userProfile.streak_count || 0;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    if (userProfile.last_post_date === yesterdayStr) newStreak += 1;
    else newStreak = 1;

    // 1. Insert reflection
    const { error: insertError } = await supabase.from('reflections').insert({
      devotional_date: devotional.publish_date,
      user_name: userProfile.username,
      content: sanitizedComment,
      parent_id: null
    });

    if (!insertError) {
      // 2. Update profile to clear the gate!
      await supabase.from('profiles').update({ 
        streak_count: newStreak, 
        last_post_date: todayStr 
      }).eq('id', session.user.id);
      
      await refreshProfile();
    } else {
      console.error(insertError);
      alert("Error saving reflection.");
    }
    setIsSubmitting(false);
  }

  if (pathname === '/login') return null;
  if (isLoading || !session || !userProfile) return null;
  if (!needsToReflect()) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-2xl">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col items-center space-y-8 animate-in fade-in duration-500 py-12">
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">The First Word</h1>
            <p className="text-sm text-zinc-400 font-light">
              Pause and reflect on today's verse to unlock the app.
            </p>
          </div>

          <div className="w-full pointer-events-none">
            {devotional ? (
              <DevotionalCard devotional={devotional} />
            ) : (
              <div className="h-40 w-full animate-pulse bg-zinc-900 rounded-3xl" />
            )}
          </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!devotional || isSubmitting}
            placeholder={devotional?.reflection_prompt || "What is God saying to you today?"}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner h-32"
            required
          />
          <button
            type="submit"
            disabled={!comment.trim() || isSubmitting || !devotional}
            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {isSubmitting ? 'Reflecting...' : 'Unlock App'}
          </button>
        </form>

        </div>
      </div>
    </div>
  );
}
