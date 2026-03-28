import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { secret, data } = payload;

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized - Invalid secret key.' }, { status: 401 });
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing or invalid data payload.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Seed Commentaries ONCE on the first chunk payload
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

    // Insert the cross-reference chunk safely into Supabase
    const { error } = await supabase
        .from('cross_references')
        .upsert(data, { onConflict: 'source_verse, target_verse', ignoreDuplicates: true });

    if (error) {
        throw error;
    }

    return NextResponse.json({ success: true, inserted: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
