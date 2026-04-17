import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from '@huggingface/transformers';

const CONTENT_DIR = path.resolve('../docs');
const OUTPUT_DIR = path.resolve('../public/index');
const CHUNK_SIZE = 400;
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const VECTOR_SIZE = 384;

// --- CLI Flags ---
const USE_INT8 = process.argv.includes('--int8');
const DTYPE = USE_INT8 ? 'int8' : 'float32';
if (USE_INT8) console.log('⚡ Int8 quantization enabled (4× smaller vectors)\n');

// --- Chunking ---
function chunkMarkdown(content, source) {
  const lines = content.split('\n');
  const chunks = [];
  let currentChunk = [];
  let currentHeading = '';
  let charCount = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      if (currentChunk.length > 0 && charCount > 50) {
        chunks.push({
          text: currentChunk.join('\n').trim(),
          heading: currentHeading,
          source: source,
        });
      }
      currentHeading = headingMatch[2];
      currentChunk = [line];
      charCount = line.length;
      continue;
    }

    if (charCount + line.length > CHUNK_SIZE * 4) {
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join('\n').trim(),
          heading: currentHeading,
          source: source,
        });
      }
      currentChunk = [line];
      charCount = line.length;
    } else {
      currentChunk.push(line);
      charCount += line.length;
    }
  }

  if (currentChunk.length > 0 && charCount > 50) {
    chunks.push({
      text: currentChunk.join('\n').trim(),
      heading: currentHeading,
      source: source,
    });
  }

  return chunks;
}

// --- Main ---
async function main() {
  console.log('🔧 Starting sharded index build...\n');

  // 1. Read all markdown files
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`📄 Found ${files.length} markdown files`);

  // 2. Chunk all files
  const allChunks = [];
  const chunksBySource = {};

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const chunks = chunkMarkdown(content, file);
    allChunks.push(...chunks);

    // Group chunks by source file
    if (!chunksBySource[file]) chunksBySource[file] = [];
    chunksBySource[file].push(...chunks);

    console.log(`  - ${file}: ${chunks.length} chunks`);
  }
  console.log(`\n📦 Total chunks: ${allChunks.length}`);

  // 3. Generate embeddings
  console.log(`\n🧠 Loading embedding model: ${EMBEDDING_MODEL}...`);
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    dtype: 'fp32',
  });

  console.log('🔢 Generating embeddings...');
  const embeddings = [];
  for (let i = 0; i < allChunks.length; i++) {
    const result = await extractor(allChunks[i].text, {
      pooling: 'mean',
      normalize: true,
    });
    embeddings.push(Array.from(result.data));
    process.stdout.write(`\r  Progress: ${i + 1}/${allChunks.length}`);
  }
  console.log('\n');

  // 4. Prepare output directory
  const chunksDir = path.join(OUTPUT_DIR, 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });

  // 5. Write manifest.json — lightweight metadata for all chunks
  const manifest = {
    version: 2,
    dtype: DTYPE,
    vectorDim: VECTOR_SIZE,
    totalChunks: allChunks.length,
    totalSources: files.length,
    chunks: allChunks.map((c, i) => ({
      id: i,
      source: c.source,
      heading: c.heading,
    })),
    sources: files,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest)
  );
  const manifestSize = (fs.statSync(path.join(OUTPUT_DIR, 'manifest.json')).size / 1024).toFixed(1);
  console.log(`📋 manifest.json: ${manifestSize} KB (dtype: ${DTYPE}, ${allChunks.length} chunks)`);

  // 6. Write vectors.bin
  let vectorsBuffer;

  if (USE_INT8) {
    // Int8 quantization: float [-1.0, 1.0] → int [-127, 127]
    const int8Vectors = new Int8Array(allChunks.length * VECTOR_SIZE);
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = 0; j < VECTOR_SIZE; j++) {
        int8Vectors[i * VECTOR_SIZE + j] = Math.round(
          Math.max(-1, Math.min(1, embeddings[i][j])) * 127
        );
      }
    }
    vectorsBuffer = Buffer.from(int8Vectors.buffer);
  } else {
    // Float32 (default)
    const flatVectors = new Float32Array(allChunks.length * VECTOR_SIZE);
    for (let i = 0; i < embeddings.length; i++) {
      flatVectors.set(embeddings[i], i * VECTOR_SIZE);
    }
    vectorsBuffer = Buffer.from(flatVectors.buffer);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'vectors.bin'), vectorsBuffer);
  const vectorsKB = (vectorsBuffer.length / 1024).toFixed(1);
  const vectorsMB = (vectorsBuffer.length / 1024 / 1024).toFixed(2);
  const bytesPerChunk = USE_INT8 ? VECTOR_SIZE : VECTOR_SIZE * 4;
  console.log(`📐 vectors.bin: ${vectorsBuffer.length > 1024 * 1024 ? vectorsMB + ' MB' : vectorsKB + ' KB'} (${DTYPE}, ${bytesPerChunk} bytes/chunk)`);

  // 7. Write per-source chunk text files — lazy-loaded on demand
  let totalChunkFiles = 0;
  let totalChunkSize = 0;

  for (const [source, chunks] of Object.entries(chunksBySource)) {
    const chunkFile = {
      source: source,
      chunks: chunks.map((c, localIdx) => ({
        // Map local index to global index for vector lookup
        globalId: allChunks.findIndex(
          ac => ac.source === c.source && ac.heading === c.heading && ac.text === c.text
        ),
        heading: c.heading,
        text: c.text,
      })),
    };

    const filename = source.replace('.md', '.json');
    const filepath = path.join(chunksDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(chunkFile));

    const fileSize = fs.statSync(filepath).size;
    totalChunkSize += fileSize;
    totalChunkFiles++;
  }

  console.log(`📄 chunks/: ${totalChunkFiles} files (${(totalChunkSize / 1024).toFixed(1)} KB total)`);

  // 8. Summary
  console.log('\n📊 Size breakdown:');
  console.log(`   manifest.json : ${manifestSize} KB  ← loaded on startup`);
  console.log(`   vectors.bin   : ${vectorsBuffer.length > 1024 * 1024 ? vectorsMB + ' MB' : vectorsKB + ' KB'}  ← loaded on startup (${DTYPE})`);
  console.log(`   chunks/ (all) : ${(totalChunkSize / 1024).toFixed(1)} KB  ← lazy-loaded per query`);
  console.log(`\n   ⚡ Browser startup: ~${(vectorsBuffer.length / 1024 / 1024 + parseFloat(manifestSize) / 1024).toFixed(2)} MB`);
  console.log(`   Per-query load  : ~${(totalChunkSize / totalChunkFiles / 1024).toFixed(1)} KB (avg per source)`);

  // Scaling estimate
  const perFileVec = (vectorsBuffer.length / files.length / 1024).toFixed(1);
  const perFileManifest = (parseFloat(manifestSize) / files.length).toFixed(1);
  console.log(`\n📈 Scaling estimates (${DTYPE}):`);
  console.log(`   Files  | vectors.bin  | manifest | Startup`);
  console.log(`   -------|-------------|----------|--------`);
  console.log(`   1000   | ~${(parseFloat(perFileVec) * 1000 / 1024).toFixed(1)} MB     | ~${(parseFloat(perFileManifest) * 1000 / 1024).toFixed(0)} KB    | ~${((parseFloat(perFileVec) * 1000 + parseFloat(perFileManifest) * 1000) / 1024).toFixed(1)} MB`);
  console.log(`   5000   | ~${(parseFloat(perFileVec) * 5000 / 1024).toFixed(1)} MB    | ~${(parseFloat(perFileManifest) * 5000 / 1024).toFixed(0)} KB   | ~${((parseFloat(perFileVec) * 5000 + parseFloat(perFileManifest) * 5000) / 1024).toFixed(1)} MB`);

  console.log('\n🎉 Sharded index build complete!');
}

main().catch(console.error);
