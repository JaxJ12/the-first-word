"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

const BOOK_MAP: Record<string, string> = {
  'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy',
  'Josh': 'Joshua', 'Judg': 'Judges', 'Ruth': 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
  '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
  'Ezra': 'Ezra', 'Neh': 'Nehemiah', 'Esth': 'Esther', 'Job': 'Job', 'Ps': 'Psalms',
  'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa': 'Isaiah',
  'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel', 'Dan': 'Daniel', 'Hos': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah', 'Mic': 'Micah',
  'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai', 'Zech': 'Zechariah',
  'Mal': 'Malachi', 'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Rom': 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
  'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phil': 'Philippians', 'Col': 'Colossians',
  '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '1Tim': '1 Timothy',
  '2Tim': '2 Timothy', 'Titus': 'Titus', 'Phlm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James',
  '1Pet': '1 Peter', '2Pet': '2 Peter', '1John': '1 John', '2John': '2 John', '3John': '3 John',
  'Jude': 'Jude', 'Rev': 'Revelation'
};

function parseVerseLabel(raw: string) {
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const book = BOOK_MAP[parts[0]];
  if (!book) return null;
  return `${book} ${parts[1]}:${parts[2]}`;
}

export default function InstallerPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<string>("Ready to ingest CSV.");
  const [isLoading, setIsLoading] = useState(false);
  const [cronSecret, setCronSecret] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!cronSecret) {
      setStatus("Error: Please type your Vercel logic Key above first.");
      return;
    }

    setIsLoading(true);
    setStatus("Parsing 15MB CSV locally and chunking...");
    setProgress(5);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      const parsedRefs = [];
      // Skip CSV header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Match simple CSV pattern like: "Genesis 1:1","Genesis 1:2",50
        const parts = line.split(',');
        if (parts.length >= 3) {
          const source = parts[0].replace(/"/g, '');
          const target = parts[1].replace(/"/g, '');
          const votesStr = parts[2].replace(/"/g, '').trim();
          
          if (source && target && parseInt(votesStr) > 0) {
            parsedRefs.push({
               source_verse: source,
               target_verse: target,
               votes: parseInt(votesStr)
            });
          }
        }
      }

      setStatus(`Valid CSV. Launching robust chunk injection for ${parsedRefs.length} references...`);
      setProgress(10);

      const chunkSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < parsedRefs.length; i += chunkSize) {
        const chunk = parsedRefs.slice(i, i + chunkSize);
        
        const chunkRes = await fetch('/api/admin/insert_chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: cronSecret, data: chunk })
        });
        
        if (!chunkRes.ok) {
           const errRep = await chunkRes.json();
           throw new Error(errRep.error || "Chunk upload failed");
        }
        
        totalInserted += chunk.length;
        const percent = Math.floor(10 + ((i + chunkSize) / parsedRefs.length) * 90);
        setProgress(Math.min(100, percent));
        setStatus(`Uploaded ${totalInserted}/${parsedRefs.length} references safely...`);
      }

      setStatus(`✅ SUCCESS! Safely inserted ${totalInserted} massive database entries. Check your app!`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ INGESTION ERROR: ${err.message}.`);
    }
    
    setIsLoading(false);
  };

  if (!session) {
    return <div className="p-10 text-white text-center mt-20">Please log in first.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">CSV Mass Uploader</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Bypass Supabase UI freezing bugs entirely. Provide your key and choose your perfectly formatted `ready_to_upload.csv`. The browser will slice it into small POST requests perfectly directly to our Edge servers.
        </p>

        <div className="text-left mb-6">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Supabase Installer Lock override</label>
          <input 
            type="password" 
            placeholder="Type any word overrider..."
            value={cronSecret} 
            onChange={(e) => setCronSecret(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div className="relative">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isLoading || !cronSecret}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 cursor-pointer file:hidden"
          />
          {isLoading && (
            <div className="absolute inset-y-0 left-0 bg-blue-400 opacity-20 transition-all duration-300 pointer-events-none rounded-lg" style={{ width: `${progress}%` }} />
          )}
        </div>

        {status && (
          <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 break-words tracking-wide">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
