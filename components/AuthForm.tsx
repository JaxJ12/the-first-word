"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);

    if (isSignUp) {
      if (!username || username.length < 3) {
        alert("Username must be at least 3 characters.");
        setAuthLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: username,
          streak_count: 0
        });
        if (profileError) {
          console.error("Profile creation error:", profileError);
          alert("Signed up, but failed to create profile. Try updating it in settings.");
        } else {
          router.push('/');
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        router.push('/');
      }
    }
    setAuthLoading(false);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] px-8 text-white relative w-full">
      <div className="absolute top-1/3 h-64 w-64 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="z-10 w-full max-w-sm space-y-8 text-center bg-zinc-950/50 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-sm shadow-2xl">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-zinc-100 italic">The First Word</h1>
          <p className="text-xs text-zinc-500 mt-2 tracking-widest uppercase font-semibold">Community Login</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
          />
          
          <button 
            type="submit" 
            disabled={authLoading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-3 rounded-lg transition-colors mt-6 shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {authLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
