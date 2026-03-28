"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  username: string;
  streak_count: number;
  last_post_date: string;
  [key: string]: any;
};

type AuthContextType = {
  session: Session | null;
  userProfile: UserProfile | null;
  friendUsernames: string[];
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friendUsernames, setFriendUsernames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUserProfile(userId: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.friend_id);
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('username')
          .in('id', friendIds);
        
        if (friendProfiles) {
          setFriendUsernames(friendProfiles.map(p => p.username));
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await fetchUserProfile(newSession.user.id);
      } else {
        setUserProfile(null);
        setFriendUsernames([]);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userProfile || !session) {
      setIsLoading(false);
    }
  }, [userProfile, session]);

  const refreshProfile = async () => {
    if (session) {
      await fetchUserProfile(session.user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setFriendUsernames([]);
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, friendUsernames, isLoading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
