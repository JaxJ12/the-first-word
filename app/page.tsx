"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [devotional, setDevotional] = useState<any>(null)
  const [reflections, setReflections] = useState<any[]>([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch the verse and the comments when the app opens
  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0]

    // 1. Get the Verse
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

    // 2. Get the Community Reflections for this specific verse
    if (displayData) {
      const { data: refs } = await supabase
        .from('reflections')
        .select('*')
        .eq('devotional_date', displayData.publish_date)
        .order('created_at', { ascending: true })
      
      if (refs) setReflections(refs)
    }
  }

  // Handle the "Post" button click
  async function submitReflection(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !comment || !devotional) return

    setIsSubmitting(true)

    // Send the new comment to your Supabase table
    const { error } = await supabase
      .from('reflections')
      .insert({
        devotional_date: devotional.publish_date,
        user_name: name,
        content: comment
      })

    if (!error) {
      setComment('') // Clear the text box
      fetchData()    // Refresh the feed to show the new comment instantly!
    }
    
    setIsSubmitting(false)
  }

  if (!devotional) return <div className="bg-[#050505] min-h-screen" />

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center bg-[#050505] px-6 py-12 text-white overflow-x-hidden font-sans pb-32">
      {/* Background Aesthetic Glows */}
      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute top-1/2 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md flex flex-col items-center space-y-10 text-center mt-8">
        {/* Date Header */}
        <header className="space-y-1">
          <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
            {new Date(devotional.publish_date).toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xl font-light text-zinc-200">
            {new Date(devotional.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* The Verse Card */}
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

        {/* Reflection Prompt */}
        <div className="w-full pt-6 border-t border-zinc-900">
          <p className="text-sm leading-relaxed text-zinc-400 font-light italic">
            {devotional.reflection_prompt}
          </p>
        </div>

        {/* COMMUNITY FEED SECTION */}
        <div className="w-full text-left space-y-6 pt-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Community</h3>
          
          {/* Display Comments */}
          <div className="space-y-4">
            {reflections.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">Be the first to share your thoughts.</p>
            ) : (
              reflections.map((ref) => (
                <div key={ref.id} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                  <p className="text-xs font-bold text-blue-400 mb-1">{ref.user_name}</p>
                  <p className="text-sm text-zinc-300 font-light leading-relaxed">{ref.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={submitReflection} className="space-y-3 pt-4 border-t border-zinc-900">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <textarea
              placeholder="What's on your mind?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-24"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Share Reflection'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}