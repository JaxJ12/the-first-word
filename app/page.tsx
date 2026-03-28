"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [devotional, setDevotional] = useState<any>(null)
  const [reflections, setReflections] = useState<any[]>([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // New state to track if we are replying to someone
  const [replyTo, setReplyTo] = useState<{ id: any; name: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0]

    const { data: dev } = await supabase
      .from('devotionals')
      .select('*')
      .eq('publish_date', today)
      .single()

    const displayData = dev || (await supabase
      .from('devotionals')
      .select('*')
      .order('publish_date', { ascending: false })
      .limit(1)
      .single()).data

    setDevotional(displayData)

    if (displayData) {
      const { data: refs } = await supabase
        .from('reflections')
        .select('*')
        .eq('devotional_date', displayData.publish_date)
        .order('created_at', { ascending: true })
      
      if (refs) setReflections(refs)
    }
  }

  // Handle the Like Button
  async function handleLike(id: any, currentLikes: number) {
    const newLikes = (currentLikes || 0) + 1
    
    // Optimistically update the UI instantly so it feels fast
    setReflections(refs => refs.map(r => r.id === id ? { ...r, likes: newLikes } : r))

    // Send the update to Supabase
    await supabase
      .from('reflections')
      .update({ likes: newLikes })
      .eq('id', id)
  }

  async function submitReflection(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !comment || !devotional) return

    setIsSubmitting(true)

    const { error } = await supabase
      .from('reflections')
      .insert({
        devotional_date: devotional.publish_date,
        user_name: name,
        content: comment,
        parent_id: replyTo ? replyTo.id : null // Attach it to the parent if replying
      })

    if (!error) {
      setComment('')
      setReplyTo(null) // Reset reply state
      fetchData()
    }
    
    setIsSubmitting(false)
  }

  // Separate top-level comments from replies
  const topLevelReflections = reflections.filter(r => !r.parent_id)

  if (!devotional) return <div className="bg-[#050505] min-h-screen" />

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-[#050505] px-6 py-12 text-white overflow-x-hidden font-sans pb-40">
      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md flex flex-col items-center space-y-10 text-center mt-8">
        <header className="space-y-1">
          <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
            {new Date(devotional.publish_date).toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xl font-light text-zinc-200">
            {new Date(devotional.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        </header>

        <section className="py-6 px-2">
          <h1 className="text-3xl font-serif leading-snug tracking-tight italic text-zinc-100">
            "{devotional.verse_text}"
          </h1>
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="h-[1px] w-8 bg-blue-500/50" />
            <p className="text-xs font-medium tracking-widest text-blue-400 uppercase">
              {devotional.reference}
            </p>
            <div className="h-[1px] w-8 bg-blue-500/50" />
          </div>
        </section>

        <div className="w-full pt-6 border-t border-zinc-900">
          <p className="text-sm leading-relaxed text-zinc-400 font-light italic">
            {devotional.reflection_prompt}
          </p>
        </div>

        {/* FEED SECTION */}
        <div className="w-full text-left space-y-6 pt-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Community Feed</h3>
          
          <div className="space-y-4">
            {topLevelReflections.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">Be the first to share your thoughts.</p>
            ) : (
              topLevelReflections.map((ref) => (
                <div key={ref.id} className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-blue-400">{ref.user_name}</p>
                    {/* The Timestamp */}
                    <p className="text-[10px] text-zinc-500">
                      {new Date(ref.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-300 font-light leading-relaxed mb-3">{ref.content}</p>
                  
                  {/* Action Bar: Like & Reply */}
                  <div className="flex items-center space-x-4 text-xs font-medium">
                    <button onClick={() => handleLike(ref.id, ref.likes)} className="flex items-center space-x-1 text-zinc-400 hover:text-red-400 transition-colors">
                      <span>♥</span>
                      <span>{ref.likes || 0}</span>
                    </button>
                    <button onClick={() => setReplyTo({ id: ref.id, name: ref.user_name })} className="text-zinc-500 hover:text-white transition-colors">
                      Reply
                    </button>
                  </div>

                  {/* Nested Replies */}
                  <div className="mt-3 space-y-3">
                    {reflections.filter(r => r.parent_id === ref.id).map(reply => (
                      <div key={reply.id} className="ml-4 pl-4 border-l-2 border-zinc-800">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-blue-300">{reply.user_name}</p>
                          <p className="text-[9px] text-zinc-600">
                            {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-400 font-light">{reply.content}</p>
                        <div className="mt-2 flex items-center text-[10px]">
                          <button onClick={() => handleLike(reply.id, reply.likes)} className="flex items-center space-x-1 text-zinc-500 hover:text-red-400 transition-colors">
                            <span>♥</span>
                            <span>{reply.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={submitReflection} className="space-y-3 pt-4 border-t border-zinc-900 sticky bottom-4 z-20 bg-[#050505] p-2 shadow-[0_-20px_20px_-15px_rgba(5,5,5,1)]">
            {/* Show who you are replying to */}
            {replyTo && (
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg text-xs text-zinc-300">
                <span>Replying to <span className="text-blue-400 font-bold">{replyTo.name}</span></span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <div className="relative">
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
      </div>
    </main>
  )
}