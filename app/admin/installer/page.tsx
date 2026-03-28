"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function InstallerPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<string>("Ready to ingest.");
  const [isLoading, setIsLoading] = useState(false);
  const [cronSecret, setCronSecret] = useState('');

  const runIngestion = async () => {
    if (!cronSecret) {
      setStatus("Error: Please provide your Cron Secret from the Vercel Dashboard.");
      return;
    }
    
    setIsLoading(true);
    setStatus("Connecting to server and downloading 15MB dataset...");
    
    try {
      // Hit our newly deployed vercel API route but from the client-side safely
      const res = await fetch(`/api/admin/seed?secret=${cronSecret}`);
      const data = await res.json();
      
      if (res.ok) {
        setStatus(`✅ SUCCESS! Inserted ${data.commentaries_seeded} Commentaries and ${data.cross_references_inserted} Cross References.`);
      } else {
        setStatus(`❌ ERROR: ${data.error || 'Unauthorized. Wrong secret key?'}`);
      }
    } catch (err: any) {
      setStatus(`❌ NETWORK ERROR: Vercel may have timed out, but some rows were likely inserted. Try again if needed.`);
    }
    
    setIsLoading(false);
  };

  if (!session) {
    return <div className="p-10 text-white text-center mt-20">Please log in first.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Study Resources Installer</h1>
        <p className="text-sm text-zinc-400 mb-6">
          This secure panel will remotely execute the massive backend ingestion script on Vercel to populate your Supabase database with the Treasury of Scripture Knowledge & Matthew Henry's Concise Commentary.
        </p>

        <div className="text-left mb-6">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Vercel Cron Secret Key</label>
          <input 
            type="password" 
            placeholder="Paste your CRON_SECRET here..."
            value={cronSecret} 
            onChange={(e) => setCronSecret(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <button 
          onClick={runIngestion}
          disabled={isLoading || !cronSecret}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Injecting Data (Takes 5-10s)...' : 'Run Data Ingestion'}
        </button>

        {status && (
          <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 break-words">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
