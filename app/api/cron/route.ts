import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch from the more stable API
    const bibleRes = await fetch('https://labs.bible.org/api/?passage=random&type=json');
    const bibleData = await bibleRes.json(); // This returns an array [ { ... } ]
    const verse = bibleData[0];

    // 2. Insert into Supabase
    const { error } = await supabase
      .from('devotionals')
      .insert({
        verse_text: verse.text,
        reference: `${verse.bookname} ${verse.chapter}:${verse.verse}`,
        reflection_prompt: "How does this verse speak to your heart today?",
        publish_date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}