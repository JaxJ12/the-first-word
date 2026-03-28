import { supabase } from '@/lib/supabase'

export default async function Home() {
  // 1. Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // 2. Fetch today's verse from your Supabase table
  const { data: devotional, error } = await supabase
    .from('devotionals')
    .select('*')
    .eq('publish_date', today)
    .single()

  if (error || !devotional) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white p-6">
        <p className="text-zinc-500 italic">No word for today yet. Check back at sunrise.</p>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black px-8 py-12 text-white">
      {/* Background Glow (Optional Styling) */}
      <div className="absolute top-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md space-y-12 text-center">
        {/* The Date */}
        <p className="text-sm font-medium tracking-[0.2em] text-zinc-500 uppercase">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* The Verse */}
        <div className="space-y-6">
          <h1 className="text-3xl font-light leading-tight tracking-tight sm:text-4xl italic">
            "{devotional.verse_text}"
          </h1>
          <p className="text-lg font-medium text-blue-400">
            {devotional.reference}
          </p>
        </div>

        {/* The Prompt */}
        <div className="pt-8 border-t border-zinc-800">
          <p className="text-zinc-400 font-light">
            {devotional.reflection_prompt}
          </p>
        </div>
      </div>
    </main>
  )
}