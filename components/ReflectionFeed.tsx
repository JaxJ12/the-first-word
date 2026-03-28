"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type ReflectionFeedProps = {
  devotionalDate: string;
};

export default function ReflectionFeed({ devotionalDate }: ReflectionFeedProps) {
  const { session, userProfile, friendUsernames, refreshProfile } = useAuth();
  
  const [reflections, setReflections] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'community' | 'friends'>('community');
  const [likedItems, setLikedItems] = useState<Set<any>>(new Set());
  
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: any; name: string } | null>(null);

  useEffect(() => {
    const savedLikes = JSON.parse(localStorage.getItem('firstWordLikes') || '[]');
    setLikedItems(new Set(savedLikes));
  }, []);

  useEffect(() => {
    if (devotionalDate) {
      fetchReflections();
    }
  }, [devotionalDate]);

  async function fetchReflections() {
    const { data: refs } = await supabase
      .from('reflections')
      .select('*')
      .eq('devotional_date', devotionalDate)
      .order('created_at', { ascending: true });
      
    if (refs) {
      setReflections(refs);
      const uniqueUsernames = [...new Set(refs.map(r => r.user_name))];
      if (uniqueUsernames.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('username, streak_count')
          .in('username', uniqueUsernames);
        
        if (profiles) {
          const streakMap: Record<string, number> = {};
          profiles.forEach(p => streakMap[p.username] = p.streak_count || 0);
          setStreaks(streakMap);
        }
      }
    }
  }

  async function handleLike(id: any, currentLikes: number) {
    if (likedItems.has(id)) return;
    
    const newLikedItems = new Set(likedItems).add(id);
    setLikedItems(newLikedItems);
    localStorage.setItem('firstWordLikes', JSON.stringify(Array.from(newLikedItems)));

    const newLikes = (currentLikes || 0) + 1;
    setReflections(refs => refs.map(r => r.id === id ? { ...r, likes: newLikes } : r));
    await supabase.from('reflections').update({ likes: newLikes }).eq('id', id);
  }

  async function submitReflection(e: React.FormEvent) {
    e.preventDefault();
    
    const sanitizedComment = comment.trim();
    if (!sanitizedComment) return;
    if (sanitizedComment.length > 500) {
      alert("Reflection must be under 500 characters.");
      return;
    }

    if (isSubmitting || !userProfile || !session) return;
    
    setIsSubmitting(true);

    const todayStr = new Date().toISOString().split('T')[0];
    let newStreak = userProfile.streak_count || 0;

    if (userProfile.last_post_date !== todayStr) {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      if (userProfile.last_post_date === yesterdayStr) newStreak += 1;
      else newStreak = 1;

      await supabase.from('profiles').update({ 
        streak_count: newStreak, 
        last_post_date: todayStr 
      }).eq('id', session.user.id);
      
      await refreshProfile();
    }

    const { error } = await supabase.from('reflections').insert({
      devotional_date: devotionalDate,
      user_name: userProfile.username,
      content: sanitizedComment,
      parent_id: replyTo ? replyTo.id : null
    });

    if (!error) {
      setComment('');
      setReplyTo(null);
      fetchReflections();
    } else {
      console.error("Submission blocked:", error.message);
      alert("Failed to post. Ensure you are logged in.");
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  }

  const topLevelReflections = reflections.filter(r => !r.parent_id);
  const displayedReflections = activeTab === 'community' 
    ? topLevelReflections 
    : topLevelReflections.filter(ref => friendUsernames.includes(ref.user_name) || ref.user_name === userProfile?.username);

  return (
    <div className="w-full text-left space-y-6 pt-4 border-t border-zinc-900 z-10 max-w-md mt-4">
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
        <button 
          onClick={() => setActiveTab('community')} 
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'community' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Community
        </button>
        <button 
          onClick={() => setActiveTab('friends')} 
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'friends' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Friends
        </button>
      </div>

      <div className="space-y-4">
        {displayedReflections.length === 0 ? (
          <p className="text-sm text-zinc-600 italic text-center py-4">No reflections here yet.</p>
        ) : (
          displayedReflections.map((ref) => {
            const isLiked = likedItems.has(ref.id);
            const userStreak = streaks[ref.user_name] || 0;
            return (
              <div key={ref.id} className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-blue-400 flex items-center space-x-1">
                    <span>{ref.user_name}</span>
                    {userStreak > 0 && <span className="text-[10px] text-orange-500 ml-1">🔥{userStreak}</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(ref.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-sm text-zinc-300 font-light leading-relaxed mb-3">{ref.content}</p>
                <div className="flex items-center space-x-4 text-xs font-medium">
                  <button 
                    onClick={() => handleLike(ref.id, ref.likes)} 
                    className={`flex items-center space-x-1 transition-colors ${isLiked ? 'text-red-500 cursor-default' : 'text-zinc-500 hover:text-red-400'}`}
                  >
                    <span>{isLiked ? '♥' : '♡'}</span><span>{ref.likes || 0}</span>
                  </button>
                  <button onClick={() => setReplyTo({ id: ref.id, name: ref.user_name })} className="text-zinc-500 hover:text-white transition-colors">
                    Reply
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {reflections.filter(r => r.parent_id === ref.id).map(reply => {
                    const isReplyLiked = likedItems.has(reply.id);
                    const replyStreak = streaks[reply.user_name] || 0;
                    return (
                      <div key={reply.id} className="ml-4 pl-4 border-l-2 border-zinc-800">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-blue-300 flex items-center space-x-1">
                            <span>{reply.user_name}</span>
                            {replyStreak > 0 && <span className="text-[9px] text-orange-500 ml-1">🔥{replyStreak}</span>}
                          </p>
                          <p className="text-[9px] text-zinc-600">
                            {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-400 font-light">{reply.content}</p>
                        <div className="mt-2 flex items-center text-[10px]">
                          <button 
                            onClick={() => handleLike(reply.id, reply.likes)} 
                            className={`flex items-center space-x-1 transition-colors ${isReplyLiked ? 'text-red-500 cursor-default' : 'text-zinc-500 hover:text-red-400'}`}
                          >
                            <span>{isReplyLiked ? '♥' : '♡'}</span><span>{reply.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={submitReflection} className="space-y-3 pt-4 border-t border-zinc-900 sticky bottom-20 z-20 bg-[#050505] p-2 shadow-[0_-20px_20px_-15px_rgba(5,5,5,1)]">
        {replyTo && (
          <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg text-xs text-zinc-300">
            <span>Replying to <span className="text-blue-400 font-bold">{replyTo.name}</span></span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
        )}
        
        <div className="relative flex w-full">
          <textarea 
            placeholder={replyTo ? "Write a reply..." : "What's on your mind?"} 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-20 pr-24" 
            required 
          />
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="absolute right-2 bottom-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
