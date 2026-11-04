import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://tfawihflisgdvizwbdrh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYXdpaGZsaXNnZHZpendiZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTQ1MzYsImV4cCI6MjEwOTM3MDUzNn0.1W3DAGd3YGZNEPBxcMar5yooH-mNfC62JgHZHkoyWes';

const library = JSON.parse(readFileSync('processed-word-library.json', 'utf-8'));
console.log(`Loading ${library.length} words in batches...`);

const CHUNK = 500;
let totalInserted = 0;

for (let i = 0; i < library.length; i += CHUNK) {
  const chunk = library.slice(i, i + CHUNK);
  const payload = chunk.map(w => ({
    finnish: w.finnish,
    turkish: w.turkish,
    word_type: w.word_type,
    level: w.level || null,
    level_verified: false,
    frequency_rank: w.frequency_rank || null,
    frequency_count: w.frequency_count || null,
    has_kotus_validation: w.has_kotus_validation,
    source: w.source,
    license: 'CC BY-SA 3.0'
  }));

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bulk_insert_word_library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ p_data: payload }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Batch ${Math.floor(i/CHUNK)} failed: ${resp.status} ${text}`);
      // Try smaller chunks
      continue;
    }

    const result = await resp.json();
    totalInserted += result || 0;
    process.stdout.write(`Batch ${Math.floor(i/CHUNK) + 1}/${Math.ceil(library.length/CHUNK)}: ${result} rows (total: ${totalInserted})\r`);
  } catch (err) {
    console.error(`Batch ${Math.floor(i/CHUNK)} error:`, err.message);
  }
}

console.log(`\nDone! Total inserted: ${totalInserted}`);
