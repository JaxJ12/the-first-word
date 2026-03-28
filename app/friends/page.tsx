"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function FriendsPage() {
  const { session, userProfile, friendUsernames, isLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [newFriendName, setNewFriendName] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendsData, setFriendsData] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    if (session && friendUsernames.length > 0) {
      fetchFriendsDetailedData();
    } else {
      setFriendsData([]);
      setIsLoadingFriends(false);
    }
  }, [session, friendUsernames]);

  async function fetchFriendsDetailedData() {
    setIsLoadingFriends(true);
    
    // 1. Fetch friend profiles (to get streaks and IDs)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('username', friendUsernames);
      
    if (profiles) {
      // 2. Fetch recent activity from verse_notes
      const { data: activities } = await supabase
        .from('verse_notes')
        .select('*')
        .in('user_name', friendUsernames)
        .order('created_at', { ascending: false });

      const mappedData = profiles.map(profile => {
        // Group activities per user
        const userActivities = activities?.filter(a => a.user_name === profile.username) || [];
        return {
          ...profile,
          recentNotes: userActivities.slice(0, 3) // Show top 3 recent verse notes
        };
      });
      
      setFriendsData(mappedData);
    }
    setIsLoadingFriends(false);
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!newFriendName || !session) return;
    
    const safeName = newFriendName.trim();
    if (!safeName) return;

    setIsAddingFriend(true);

    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', safeName)
      .single();

    if (!friendProfile) {
      alert("User not found!");
      setIsAddingFriend(false);
      return;
    }

    if (friendProfile.id === session.user.id) {
      alert("You can't add yourself!");
      setIsAddingFriend(false);
      return;
    }

    const { error } = await supabase.from('friendships').insert({ 
      user_id: session.user.id, 
      friend_id: friendProfile.id 
    });

    if (!error) {
      setNewFriendName('');
      await refreshProfile();
    } else {
      alert("Already friends or could not add!");
    }
    
    setIsAddingFriend(false);
  }

  async function handleRemoveFriend(friendId: string, friendName: string) {
    if (!session || !confirm(`Are you sure you want to remove ${friendName}?`)) return;

    const { error } = await supabase
      .from('friendships')
      .delete()
      .match({ user_id: session.user.id, friend_id: friendId });

    if (!error) {
      await refreshProfile();
    }
  }

  if (isLoading || !session) return <div className="bg-[#050505] min-h-[100dvh]" />;

  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white px-4 md:px-6 py-8 font-sans pb-32 overflow-x-hidden">
      <div className="flex flex-col mb-8 mt-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif italic text-blue-300">Your Circle</h1>
        <p className="text-xs text-zinc-500 mt-2">Connect and grow with others in faith.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* ADD FRIEND FORM */}
        <section className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50">
          <form onSubmit={handleAddFriend} className="flex space-x-2">
            <input 
              type="text" 
              placeholder="Find friends by username..." 
              value={newFriendName} 
              onChange={(e) => setNewFriendName(e.target.value)} 
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner" 
            />
            <button 
              type="submit" 
              disabled={isAddingFriend} 
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isAddingFriend ? '...' : 'Add'}
            </button>
          </form>
        </section>

        {/* FRIENDS LIST */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase border-b border-zinc-900 pb-2">
            Friends List
          </h2>

          {isLoadingFriends ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : friendsData.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/20 rounded-2xl border border-zinc-900 border-dashed">
              <span className="text-3xl mb-3 block">🫂</span>
              <p className="text-sm text-zinc-400 font-serif italic">Your circle is empty.</p>
              <p className="text-xs text-zinc-600 mt-1">Search for a username above to invite them.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friendsData.map(friend => (
                <div key={friend.id} className="bg-zinc-900/40 rounded-2xl border border-zinc-800/50 overflow-hidden flex flex-col">
                  {/* Friend Header */}
                  <div className="p-4 bg-zinc-800/20 border-b border-zinc-800/50 flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-blue-100 flex items-center gap-2">
                        {friend.username}
                        {friend.streak_count > 0 && (
                          <span className="text-xs text-orange-500 bg-orange-500/10 px-2 rounded-full py-0.5 mt-0.5">
                            🔥 {friend.streak_count}
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveFriend(friend.id, friend.username)}
                      className="text-zinc-600 hover:text-red-400 transition-colors text-xs font-bold bg-zinc-900 px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Friend Activity */}
                  <div className="p-4 flex-1">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Notes</h4>
                    {friend.recentNotes && friend.recentNotes.length > 0 ? (
                      <div className="space-y-3">
                        {friend.recentNotes.map((note: any) => (
                          <div key={note.id} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                            <p className="text-[10px] font-semibold text-blue-400 mb-1">
                              {note.reference}
                            </p>
                            <p className="text-xs text-zinc-300 font-serif italic line-clamp-2">
                              "{note.content}"
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600 italic">No recent bible notes.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
