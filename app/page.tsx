"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home')

  // Auth States
  const [session, setSession] = useState<any>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  
  // Profile States
  const [userProfile, setUserProfile] = useState<any>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)

  // Social States
  const [activeTab, setActiveTab] = useState<'community' | 'friends'>('community')
  const [friendUsernames, setFriendUsernames] = useState<string[]>([])
  const [newFriendName, setNewFriendName] = useState('')
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  // Timing States
  const [reminderTime, setReminderTime] = useState('08:00')

  // Feed States
  const [devotional, setDevotional] = useState<any>(null)
  const [reflections, setReflections] = useState<any[]>([])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: any; name: string } | null>(null)
  const [likedItems, setLikedItems] = useState<Set<any>>(new Set())
  const [streaks, setStreaks] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setEditEmail(session.user.email || '')
        fetchUserProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setEditEmail(session.user.email || '')
        fetchUserProfile(session.user.id)
      }
    })

    const savedLikes = JSON.parse(localStorage.getItem('firstWordLikes') || '[]')
    setLikedItems(new Set(savedLikes))
    setReminderEnabled(localStorage.getItem('firstWordReminder') === 'true')

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {

    // ADD THIS PART:
    const savedTime = localStorage.getItem('firstWordReminderTime') || '08:00'
    setReminderTime(savedTime)

    const timer = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const isEnabled = localStorage.getItem('firstWordReminder') === 'true'
      
      if (isEnabled && currentTime === localStorage.getItem('firstWordReminderTime')) {
        if (Notification.permission === 'granted') {
          new Notification("The First Word", {
            body: "Your daily verse is ready.",
            icon: "/icon-192x192.png"
          })
        }
      }
    }, 60000) 

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (session) fetchData()
  }, [session])

  async function fetchUserProfile(userId: string) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (profile) {
      setUserProfile(profile)
      setEditUsername(profile.username)
    }

    const { data: friendships } = await supabase.from('friendships').select('friend_id').eq('user_id', userId)
    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => f.friend_id)
      const { data: friendProfiles } = await supabase.from('profiles').select('username').in('id', friendIds)
      if (friendProfiles) setFriendUsernames(friendProfiles.map(p => p.username))
    }
  }

  // --- SETTINGS LOGIC ---
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    
    // 1. Sanitize & Validate Username
    const safeUsername = editUsername.trim()
    
    // Reject empty or wildly long usernames
    if (!safeUsername || safeUsername.length < 3 || safeUsername.length > 20) {
      alert("Username must be between 3 and 20 characters.")
      return
    }

    // Regex Check: Only allow letters, numbers, and underscores (No weird symbols)
    if (!/^[a-zA-Z0-9_]+$/.test(safeUsername)) {
      alert("Username can only contain letters, numbers, and underscores.")
      return
    }

    setIsUpdatingProfile(true)

    if (safeUsername !== userProfile.username) {
      const { error } = await supabase.from('profiles').update({ username: safeUsername }).eq('id', session.user.id)
      if (!error) {
        setUserProfile({ ...userProfile, username: safeUsername })
        alert("Username updated!")
      } else {
        alert("That username might be taken or invalid.")
      }
    }

    if (editEmail !== session.user.email) {
      // 2. Sanitize & Validate Email
      const safeEmail = editEmail.trim()
      if (!/^\S+@\S+\.\S+$/.test(safeEmail)) {
        alert("Please enter a valid email address.")
        setIsUpdatingProfile(false)
        return
      }
      const { error } = await supabase.auth.updateUser({ email: safeEmail })
      if (!error) alert("Email update link sent! Please check your new email's inbox.")
      else alert(error.message)
    }

    setIsUpdatingProfile(false)
  }

  function toggleReminder() {
    const newState = !reminderEnabled
    setReminderEnabled(newState)
    localStorage.setItem('firstWordReminder', newState.toString())
    
    if (newState && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') alert("Daily reminders enabled!")
      })
    }
  }

  // --- FRIEND LOGIC ---
  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    if (!newFriendName || !userProfile || !session) return
    setIsAddingFriend(true)

    const { data: friendProfile } = await supabase.from('profiles').select('id, username').ilike('username', newFriendName).single()

    if (!friendProfile) {
      alert("User not found!")
      setIsAddingFriend(false)
      return
    }

    if (friendProfile.id === session.user.id) {
      alert("You can't add yourself!")
      setIsAddingFriend(false)
      return
    }

    const { error } = await supabase.from('friendships').insert({ user_id: session.user.id, friend_id: friendProfile.id })

    if (!error) {
      setFriendUsernames(prev => [...prev, friendProfile.username])
      setNewFriendName('')
    } else {
      alert("Already friends!")
    }
    setIsAddingFriend(false)
  }

  // --- AUTH LOGIC ---
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else if (data.user) await supabase.from('profiles').insert({ id: data.user.id, username: editUsername, streak_count: 0 })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    }
    setAuthLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setCurrentView('home')
  }

  function handleTimeChange(newTime: string) {
    setReminderTime(newTime)
    localStorage.setItem('firstWordReminderTime', newTime)
  }

  // --- FEED LOGIC ---
  async function fetchData() {
    const today = new Date().toISOString().split('T')[0]
    const { data: dev } = await supabase.from('devotionals').select('*').eq('publish_date', today).single()
    const displayData = dev || (await supabase.from('devotionals').select('*').order('publish_date', { ascending: false }).limit(1).single()).data
    setDevotional(displayData)

    if (displayData) {
      const { data: refs } = await supabase.from('reflections').select('*').eq('devotional_date', displayData.publish_date).order('created_at', { ascending: true })
      if (refs) {
        setReflections(refs)
        const uniqueUsernames = [...new Set(refs.map(r => r.user_name))]
        if (uniqueUsernames.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('username, streak_count').in('username', uniqueUsernames)
          if (profiles) {
            const streakMap: Record<string, number> = {}
            profiles.forEach(p => streakMap[p.username] = p.streak_count || 0)
            setStreaks(streakMap)
          }
        }
      }
    }
  }

  async function handleLike(id: any, currentLikes: number) {
    if (likedItems.has(id)) return 
    const newLikedItems = new Set(likedItems).add(id)
    setLikedItems(newLikedItems)
    localStorage.setItem('firstWordLikes', JSON.stringify(Array.from(newLikedItems)))

    const newLikes = (currentLikes || 0) + 1
    setReflections(refs => refs.map(r => r.id === id ? { ...r, likes: newLikes } : r))
    await supabase.from('reflections').update({ likes: newLikes }).eq('id', id)
  }

  async function submitReflection(e: React.FormEvent) {
    e.preventDefault()
    
    // 1. Sanitize the Input (strip trailing whitespace)
    const sanitizedComment = comment.trim()

    // 2. Strict Length Validation
    if (!sanitizedComment) return
    if (sanitizedComment.length > 500) {
      alert("Reflection must be under 500 characters.")
      return
    }

    // 3. Client-Side Throttle (Prevents double-clicking the submit button)
    if (isSubmitting || !devotional || !userProfile) return
    
    setIsSubmitting(true)

    const todayStr = new Date().toISOString().split('T')[0]
    let newStreak = userProfile.streak_count || 0

    if (userProfile.last_post_date !== todayStr) {
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0]

      if (userProfile.last_post_date === yesterdayStr) newStreak += 1
      else newStreak = 1

      await supabase.from('profiles').update({ streak_count: newStreak, last_post_date: todayStr }).eq('id', session.user.id)
      setUserProfile({ ...userProfile, streak_count: newStreak, last_post_date: todayStr })
    }

    const { error } = await supabase.from('reflections').insert({
      devotional_date: devotional.publish_date,
      user_name: userProfile.username,
      content: sanitizedComment, // Use the sanitized version!
      parent_id: replyTo ? replyTo.id : null
    })

    if (!error) {
      setComment('')
      setReplyTo(null)
      fetchData()
    } else {
      console.error("Submission blocked:", error.message)
      alert("Failed to post. Ensure you are logged in.")
    }
    
    // Add a slight artificial delay to prevent rapid-fire posting
    setTimeout(() => {
      setIsSubmitting(false)
    }, 1000)
  }

  const topLevelReflections = reflections.filter(r => !r.parent_id)
  const displayedReflections = activeTab === 'community' 
    ? topLevelReflections 
    : topLevelReflections.filter(ref => friendUsernames.includes(ref.user_name) || ref.user_name === userProfile?.username)

  // --- UI: LOGIN SCREEN ---
  if (!session) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] px-8 text-white">
        <div className="absolute top-1/3 h-64 w-64 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="z-10 w-full max-w-sm space-y-8 text-center">
          <div>
            <h1 className="text-3xl font-serif tracking-tight text-zinc-100">The First Word</h1>
            <p className="text-sm text-zinc-500 mt-2 tracking-widest uppercase">Community Login</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && <input type="text" placeholder="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
            <button type="submit" disabled={authLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-3 rounded-lg transition-colors mt-4">{authLoading ? '...' : (isSignUp ? 'Create Account' : 'Sign In')}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-zinc-500 hover:text-white transition-colors">{isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}</button>
        </div>
      </main>
    )
  }

  // --- UI: PROFILE & SETTINGS VIEW ---
  if (currentView === 'profile') {
    return (
      <main className="min-h-[100dvh] bg-[#050505] text-white px-6 py-12 font-sans pb-40">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-xl font-serif italic text-zinc-100">Profile & Settings</h1>
          <button onClick={() => setCurrentView('home')} className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">Close</button>
        </div>

        <div className="space-y-10 max-w-md mx-auto">
          {/* Account Settings */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">Account Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Username</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={isUpdatingProfile} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs py-3 rounded-lg transition-colors">{isUpdatingProfile ? 'Updating...' : 'Save Changes'}</button>
            </form>
          </section>

          {/* Friends List & Adder */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-2">Your Circle</h3>
            <form onSubmit={handleAddFriend} className="flex space-x-2">
              <input type="text" placeholder="Add friend by username..." value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={isAddingFriend} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors">{isAddingFriend ? '...' : 'Add'}</button>
            </form>
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-4 space-y-3">
              {friendUsernames.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No friends added yet.</p>
              ) : (
                friendUsernames.map((friend, idx) => (
                  <div key={idx} className="flex items-center text-sm text-zinc-300">
                    <span className="text-blue-400 mr-2">@</span>{friend}
                  </div>
                ))
              )}
            </div>
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
                    className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="pt-8 text-center">
             <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors">Sign Out</button>
          </section>
        </div>
      </main>
    )
  }

  // --- UI: HOME FEED ---
  if (!devotional) return <div className="bg-[#050505] min-h-[100dvh]" />

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-[#050505] px-6 py-12 text-white overflow-x-hidden font-sans pb-40">
      
      {/* Top Nav */}
      <div className="absolute top-6 right-6 z-20">
        <button onClick={() => setCurrentView('profile')} className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full transition-colors shadow-lg">
          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
            {userProfile?.username || 'Profile'}
          </span>
          {userProfile?.streak_count > 0 && <span className="text-[10px] text-orange-500">🔥{userProfile.streak_count}</span>}
        </button>
      </div>

      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md flex flex-col items-center space-y-10 text-center mt-4">
        <header className="space-y-1">
          <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">{new Date(devotional.publish_date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
          <p className="text-xl font-light text-zinc-200">{new Date(devotional.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
        </header>

        <section className="py-6 px-2">
          <h1 className="text-3xl font-serif leading-snug tracking-tight italic text-zinc-100">"{devotional.verse_text}"</h1>
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="h-[1px] w-8 bg-blue-500/50" />
            <p className="text-xs font-medium tracking-widest text-blue-400 uppercase">{devotional.reference}</p>
            <div className="h-[1px] w-8 bg-blue-500/50" />
          </div>
        </section>

        <div className="w-full pt-6 border-t border-zinc-900">
          <p className="text-sm leading-relaxed text-zinc-400 font-light italic">{devotional.reflection_prompt}</p>
        </div>

        {/* FEED & TABS SECTION (Cleaned up!) */}
        <div className="w-full text-left space-y-6 pt-4 border-t border-zinc-900">
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setActiveTab('community')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'community' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Community</button>
            <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === 'friends' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Friends</button>
          </div>

          <div className="space-y-4">
            {displayedReflections.length === 0 ? (
              <p className="text-sm text-zinc-600 italic text-center py-4">No reflections here yet.</p>
            ) : (
              displayedReflections.map((ref) => {
                const isLiked = likedItems.has(ref.id)
                const userStreak = streaks[ref.user_name] || 0
                return (
                  <div key={ref.id} className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-blue-400 flex items-center space-x-1">
                        <span>{ref.user_name}</span>
                        {userStreak > 0 && <span className="text-[10px] text-orange-500 ml-1">🔥{userStreak}</span>}
                      </p>
                      <p className="text-[10px] text-zinc-500">{new Date(ref.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-sm text-zinc-300 font-light leading-relaxed mb-3">{ref.content}</p>
                    <div className="flex items-center space-x-4 text-xs font-medium">
                      <button onClick={() => handleLike(ref.id, ref.likes)} className={`flex items-center space-x-1 transition-colors ${isLiked ? 'text-red-500 cursor-default' : 'text-zinc-500 hover:text-red-400'}`}>
                        <span>{isLiked ? '♥' : '♡'}</span><span>{ref.likes || 0}</span>
                      </button>
                      <button onClick={() => setReplyTo({ id: ref.id, name: ref.user_name })} className="text-zinc-500 hover:text-white transition-colors">Reply</button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {reflections.filter(r => r.parent_id === ref.id).map(reply => {
                        const isReplyLiked = likedItems.has(reply.id)
                        const replyStreak = streaks[reply.user_name] || 0
                        return (
                          <div key={reply.id} className="ml-4 pl-4 border-l-2 border-zinc-800">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[11px] font-bold text-blue-300 flex items-center space-x-1">
                                <span>{reply.user_name}</span>
                                {replyStreak > 0 && <span className="text-[9px] text-orange-500 ml-1">🔥{replyStreak}</span>}
                              </p>
                              <p className="text-[9px] text-zinc-600">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <p className="text-xs text-zinc-400 font-light">{reply.content}</p>
                            <div className="mt-2 flex items-center text-[10px]">
                              <button onClick={() => handleLike(reply.id, reply.likes)} className={`flex items-center space-x-1 transition-colors ${isReplyLiked ? 'text-red-500 cursor-default' : 'text-zinc-500 hover:text-red-400'}`}>
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

          <form onSubmit={submitReflection} className="space-y-3 pt-4 border-t border-zinc-900 sticky bottom-4 z-20 bg-[#050505] p-2 shadow-[0_-20px_20px_-15px_rgba(5,5,5,1)]">
            {replyTo && (
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg text-xs text-zinc-300">
                <span>Replying to <span className="text-blue-400 font-bold">{replyTo.name}</span></span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
            )}
            
            <div className="relative">
              <textarea placeholder={replyTo ? "Write a reply..." : "What's on your mind?"} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-20 pr-24" required />
              <button type="submit" disabled={isSubmitting} className="absolute right-2 bottom-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-md transition-colors disabled:opacity-50">{isSubmitting ? '...' : 'Post'}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}