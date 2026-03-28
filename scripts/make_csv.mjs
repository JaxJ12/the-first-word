import fs from 'fs';

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

function parseVerseLabel(raw) {
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const book = BOOK_MAP[parts[0]];
  if (!book) return null;
  return `${book} ${parts[1]}:${parts[2]}`;
}

try {
  console.log("Reading cross_references.txt...");
  const lines = fs.readFileSync('cross_references.txt', 'utf8').split('\n');
  const csvLines = ['source_verse,target_verse,votes'];

  console.log("Parsing formatting and abbreviations...");
  for (const line of lines) {
    if (!line.trim() || line.startsWith('From Verse')) continue;
    
    const parts = line.split('\t');
    if (parts.length >= 3) {
        const source = parseVerseLabel(parts[0]);
        const target = parseVerseLabel(parts[1]);
        const votes = parseInt(parts[2], 10);
        
        if (source && target && votes > 0) {
            csvLines.push(`"${source}","${target}",${votes}`);
        }
    }
  }

  console.log("Writing ready_to_upload.csv...");
  fs.writeFileSync('ready_to_upload.csv', csvLines.join('\n'));
  console.log(`✅ Success! Generated ready_to_upload.csv with ${csvLines.length - 1} valid mapped references!`);
} catch (e) {
  console.error("Error reading cross_references.txt. Did you drop it in the root 'the-first-word' folder?", e.message);
}
