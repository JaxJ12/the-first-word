import fs from 'fs';

try {
  console.log("Reading ready_to_upload.csv...");
  const lines = fs.readFileSync('ready_to_upload.csv', 'utf8').split('\n');
  const headers = lines[0];
  const dataLines = lines.slice(1);
  
  const CHUNK_SIZE = 50000; // 50,000 rows per file (approx 2MB)
  let fileCount = 1;

  for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
    const chunk = dataLines.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0 || !chunk[0].trim()) continue;
    
    const chunkContent = [headers, ...chunk].join('\n');
    const fileName = `upload_part_${fileCount}.csv`;
    fs.writeFileSync(fileName, chunkContent);
    console.log(`Generated ${fileName} with ${chunk.length} references.`);
    fileCount++;
  }
  
  console.log(`✅ Success! Split into ${fileCount - 1} easy-to-digest files. Supabase will not freeze now!`);
} catch (e) {
  console.error("Error splitting CSV file:", e.message);
}
