import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Extremely basic OpenBible format expansion (e.g., 'Gen.1.1' -> 'Genesis 1:1')
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

function parseVerse(raw: string) {
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const book = BOOK_MAP[parts[0]];
  if (!book) return null;
  return `${book} ${parts[1]}:${parts[2]}`;
}

export async function GET(request: Request) {
  // To protect this endpoint, require an admin key to be passed via query param
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized - Provide a valid secret query parameter.', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // We fetch an open-source subset or full CSV from OpenBible
    // To prevent Vercel 10s Serverless Timeout on 344k rows, we fetch a limited chunk,
    // or typically we'd offload this to a background worker. For this demonstration, we
    // pull a lightweight JSON we pretend is our cross reference mapping, or pull the real CSV
    // and parse a small chunk.

    const res = await fetch('https://raw.githubusercontent.com/openbibleinfo/CrossReferenceData/master/cross_references.txt');
    const text = await res.text();
    
    // This text file is huge. Splitting and mapping only the top 1000 for this seed example to stay within Vercel timeout.
    const lines = text.split('\n').filter(l => l.trim() !== '' && !l.startsWith('From Verse'));
    
    // Process top 1000 highest voted connections, or just first 1000. 
    // Usually, you pass a 'page' param to chunk this in a real application.
    const limit = 2000;
    const batch = [];
    
    for (let i = 0; i < Math.min(limit, lines.length); i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 3) {
            const source = parseVerse(parts[0]);
            const target = parseVerse(parts[1]);
            const votes = parseInt(parts[2], 10);
            
            if (source && target && votes > 0) {
                batch.push({
                    source_verse: source,
                    target_verse: target,
                    votes: votes
                });
            }
        }
    }

    if (batch.length === 0) {
        return NextResponse.json({ error: "No parsable verses found" }, { status: 400 });
    }

    // Insert into Supabase natively (upsert or ignore duplicates)
    const { error } = await supabase
        .from('cross_references')
        .upsert(batch, { onConflict: 'source_verse, target_verse', ignoreDuplicates: true });

    if (error) {
        throw error;
    }

    return NextResponse.json({ success: true, inserted: batch.length, message: "Use ?page=2 logic in future runs to ingest the whole DB" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
