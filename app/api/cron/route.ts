import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This creates the connection to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup the backend client with your secret key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // Security: Check if Vercel is the one calling this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Get a random verse
    const bibleRes = await fetch('https://bible-api.com/random?translation=kjv');
    const bibleData = await bibleRes.json();

    // 2. Set the daily prompt
    const reflection_prompt = `How does this verse speak to your heart this morning?`;

    // 3. Save it to your Supabase table
    const { error } = await supabase
      .from('devotionals')
      .insert({
        verse_text: bibleData.text,
        reference: bibleData.reference,
        reflection_prompt: reflection_prompt,
        publish_date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Devotional updated!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}