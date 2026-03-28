"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { session, userProfile, friendUsernames, isLoading, refreshProfile, logout } = useAuth();
  const router = useRouter();

  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    if (userProfile) {
      setEditUsername(userProfile.username || '');
    }
    if (session?.user?.email) {
      setEditEmail(session.user.email);
    }
    
    setReminderEnabled(localStorage.getItem('firstWordReminder') === 'true');
    setReminderTime(localStorage.getItem('firstWordReminderTime') || '08:00');
  }, [userProfile, session]);

  if (isLoading || !session) return <div className="bg-[#050505] min-h-[100dvh]" />;

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const safeUsername = editUsername.trim();
    
    if (!safeUsername || safeUsername.length < 3 || safeUsername.length > 20) {
      alert("Username must be between 3 and 20 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(safeUsername)) {
      alert("Username can only contain letters, numbers, and underscores.");
      return;
    }

    setIsUpdatingProfile(true);

    if (safeUsername !== userProfile?.username) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: safeUsername })
        .eq('id', session.user.id);
        
      if (!error) {
        await refreshProfile();
        alert("Username updated!");
      } else {
        alert("That username might be taken or invalid.");
      }
    }

    if (editEmail !== session.user.email) {
      const safeEmail = editEmail.trim();
      if (!/^\S+@\S+\.\S+$/.test(safeEmail)) {
        alert("Please enter a valid email address.");
        setIsUpdatingProfile(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: safeEmail });
      if (!error) alert("Email update link sent! Please check your new email's inbox.");
      else alert(error.message);
    }

    setIsUpdatingProfile(false);
  }

  function toggleReminder() {
    const newState = !reminderEnabled;
    setReminderEnabled(newState);
    localStorage.setItem('firstWordReminder', newState.toString());
    
    if (newState && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') alert("Daily reminders enabled!");
      });
    }
  }

  function handleTimeChange(newTime: string) {
    setReminderTime(newTime);
    localStorage.setItem('firstWordReminderTime', newTime);
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white px-6 py-12 font-sans pb-40">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-serif italic text-zinc-100">Profile & Settings</h1>
        <Link 
          href="/" 
          className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
        >
          Close
        </Link>
      </div>

      <div className="space-y-10 max-w-md mx-auto">
        {/* Account Settings */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">Account Details</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Username</label>
              <input 
                type="text" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value)} 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" 
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Email</label>
              <input 
                type="email" 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" 
              />
            </div>
            <button 
              type="submit" 
              disabled={isUpdatingProfile} 
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* App Preferences */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">Preferences</h3>
          
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-zinc-300">Daily Reminder</p>
                <p className="text-[10px] text-zinc-500 mt-1">Get notified when it's time to reflect.</p>
              </div>
              <button onClick={toggleReminder} className={`w-12 h-6 rounded-full transition-colors relative ${reminderEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${reminderEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
        
            {/* SHOW TIME PICKER ONLY IF ENABLED */}
            {reminderEnabled && (
              <div className="pt-4 border-t border-zinc-800 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-zinc-400">Reminder Time</p>
                <input 
                  type="time" 
                  value={reminderTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-blue-400 font-bold focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 text-center border-t border-zinc-900/50">
           <button 
             onClick={handleLogout} 
             className="text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors py-2 px-4 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 outline-none"
           >
             Sign Out
           </button>
        </section>
      </div>
    </main>
  );
}
