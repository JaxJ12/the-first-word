import BibleReader from '@/components/BibleReader';

export default function BiblePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden pt-6">
      <div className="flex justify-center mb-6">
        <h1 className="text-xl font-serif italic text-zinc-100">Scripture</h1>
      </div>
      <BibleReader />
    </main>
  );
}
