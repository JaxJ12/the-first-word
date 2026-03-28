import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually for this standalone script
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const val = valueParts.join('=').trim().replace(/(^"|"$)/g, '');
      if (key && val) process.env[key.trim()] = val;
    }
  });
} catch (err) {
  console.log("No .env.local file found! Make sure you define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BOOK_MAP = {
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

function parseVerse(raw) {
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const book = BOOK_MAP[parts[0]];
  if (!book) return null;
  return `${book} ${parts[1]}:${parts[2]}`;
}

async function seedCrossReferences() {
  console.log("Downloading OpenBible Treasury of Scripture Knowledge CSV...");
  const res = await fetch('https://raw.githubusercontent.com/openbibleinfo/CrossReferenceData/master/cross_references.txt');
  const text = await res.text();
  
  const lines = text.split('\n').filter(l => l.trim() !== '' && !l.startsWith('From Verse'));
  console.log(`Found ${lines.length} total cross-references.`);

  // We will insert the Top 50,000 to keep the database size manageable for the free tier
  const limit = Math.min(50000, lines.length);
  const CHUNK_SIZE = 1000;
  let batch = [];
  
  for (let i = 0; i < limit; i++) {
    const parts = lines[i].split('\t');
    if (parts.length >= 3) {
      const source = parseVerse(parts[0]);
      const target = parseVerse(parts[1]);
      const votes = parseInt(parts[2], 10);
      
      if (source && target && votes > 0) {
        batch.push({ source_verse: source, target_verse: target, votes });
      }
    }
    
    if (batch.length === CHUNK_SIZE || i === limit - 1) {
      console.log(`Uploading chunk up to line ${i}...`);
      const { error } = await supabase.from('cross_references').upsert(batch, { onConflict: 'source_verse, target_verse', ignoreDuplicates: true });
      if (error) console.error("Error inserting chunk:", error.message);
      batch = []; // reset batch
    }
  }
  console.log("✅ Cross References Seeded Successfully!");
}

async function seedInitialCommentary() {
  console.log("Seeding sample Matthew Henry Concise Commentary data...");
  // As a massive JSON of MHC commentary is hard to find natively formatted for this app, 
  // we will insert structural commentary for testing the UI. 
  // You can replace or extend this JSON heavily once you download an official MHC XML dump!
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

  const { error } = await supabase.from('commentaries').upsert(defaultCommentaries, { onConflict: 'reference' });
  if (error) {
    console.error("Error inserting commentaries:", error);
  } else {
    console.log("✅ Mock Commentaries Seeded Successfully!");
  }
}

async function run() {
  console.log("--- STARTING DATABASE SEED ---");
  await seedInitialCommentary();
  await seedCrossReferences();
  console.log("--- SEED COMPLETE ---");
}

run();
