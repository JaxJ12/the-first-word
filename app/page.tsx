import { supabase } from '@/lib/supabase'

export default async function Home() {
  const today = new Date().toISOString().split('T')[0]

  const { data: devotional, error } = await supabase
    .from('devotionals')
    .select('*')
    .eq('publish_date', today)
    .single()

  // If no verse for today, grab the most recent one instead of showing an error
  const displayData = devotional || (await supabase
    .from('devotionals')
    .select('*')
    .order('publish_date', { ascending: false })
    .limit(1)
    .single()).data

  if (!displayData) return <div className="bg-black min-h-screen" />

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-[#050505] px-8 py-20 text-white overflow-hidden">
      {/* Background Aesthetic Glows */}
      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md flex flex-col items-center space-y-12 text-center">
        {/* Date Header */}
        <header className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-2xl font-light text-zinc-200">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* The Verse Card */}
        <section className="py-10 px-4">
          <h1 className="text-3xl font-serif leading-snug tracking-tight italic text-zinc-100 sm:text-4xl">
            "{displayData.verse_text}"
          </h1>
          <div className="mt-8 flex items-center justify-center space-x-4">
            <div className="h-[1px] w-8 bg-blue-500/50" />
            <p className="text-sm font-medium tracking-widest text-blue-400 uppercase">
              {displayData.reference}
            </p>
            <div className="h-[1px] w-8 bg-blue-500/50" />
          </div>
        </section>

        {/* Reflection Section */}
        <footer className="w-full max-w-[280px] pt-10">
          <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase mb-4">Reflection</p>
          <p className="text-sm leading-relaxed text-zinc-400 font-light italic">
            {displayData.reflection_prompt}
          </p>
        </footer>
      </div>

      {/* App Branding */}
      <div className="z-10 pb-4">
        <p className="text-[10px] tracking-[0.5em] text-zinc-700 uppercase font-black">
          The First Word
        </p>
      </div>
    </main>
  )
}