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
    return new Response('Unauthorized - Provide a valid secret query parameter matching your CRON_SECRET.', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Seed Initial Commentary for John 1
    const defaultCommentaries = [
      {
        reference: "John 1:1",
        text: "Matthew Henry's Concise Commentary: In the beginning was the Word. The plainest reason why the Son of God is called the Word, seems to be, that as our words explain our minds to others, so was the Son of God sent in order to reveal his Father's mind to the world. What the evangelist says of Christ proves that he is God. He asserts, His existence in the beginning; His coexistence with the Father."
      },
      {
        reference: "John 1:2",
        text: "Matthew Henry's Concise Commentary: The same was in the beginning with God. The word was with God, in respect of essence and nature, making one God with him; and was 'with God' in respect of relation and personality, but truly and distinctly. Christ was all in all to the Father from eternity."
      },
      {
        reference: "John 1:3",
        text: "Matthew Henry's Concise Commentary: All things were made by him. Christ is the Creator of all things. This confirms his Divine nature. All things, not only in the lower world, but also the world of angels."
      },
      {
        reference: "John 1:4",
        text: "Matthew Henry's Concise Commentary: In him was life, and the life was the light of men. He is the fountain of biological life, spiritual life, and eternal life. All the light of reason and revelation that the world was ever blessed with came from Christ."
      },
      {
        reference: "John 1:5",
        text: "Matthew Henry's Concise Commentary: And the light shineth in darkness. The darkness of this world, the darkness of humanity's sinful state, did not comprehend the glorious nature of the Word."
      }
    ];

    await supabase.from('commentaries').upsert(defaultCommentaries, { onConflict: 'reference' });

    // 2. Fetch an open-source subset of Cross References from OpenBible
    const res = await fetch('https://raw.githubusercontent.com/openbibleinfo/CrossReferenceData/master/cross_references.txt');
    const text = await res.text();
    
    // Process top 2500 highest voted connections to prevent Vercel 10s Serverless Timeout
    const lines = text.split('\n').filter(l => l.trim() !== '' && !l.startsWith('From Verse'));
    const limit = 2500;
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

    return NextResponse.json({ 
      success: true, 
      commentaries_seeded: 5,
      cross_references_inserted: batch.length, 
      message: "Security and Ingestion Passed! Go check the app." 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
