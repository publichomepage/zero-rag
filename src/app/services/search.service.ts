import { Injectable, signal } from '@angular/core';

export interface SearchResult {
  text: string;
  heading: string;
  source: string;
  score: number;
}

interface ManifestChunk {
  id: number;
  source: string;
  heading: string;
}

interface Manifest {
  version: number;
  dtype: 'float32' | 'int8';
  vectorDim: number;
  totalChunks: number;
  totalSources: number;
  chunks: ManifestChunk[];
  sources: string[];
}

interface SourceChunkFile {
  source: string;
  chunks: Array<{
    globalId: number;
    heading: string;
    text: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private manifest: Manifest | null = null;
  private vectors: Float32Array | Int8Array | null = null;
  private dtype: 'float32' | 'int8' = 'float32';
  private vectorDim = 384;

  // Cache for lazy-loaded chunk text files
  private chunkTextCache = new Map<string, SourceChunkFile>();

  private ghRepo: string | null = null;
  private ghToken: string | null = null;

  setGithubConfig(repo: string, token: string) {
    this.ghRepo = repo;
    this.ghToken = token;
  }

  private async ghFetch(filePath: string): Promise<Response> {
    if (this.ghRepo && this.ghToken) {
      // Use GitHub API to fetch raw content (works for private repos too)
      const url = `https://api.github.com/repos/${this.ghRepo}/contents/public/index/${filePath}`;
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.ghToken}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
    }
    // Fallback to local ./public/index (relative to base-href)
    return fetch(`index/${filePath}`);
  }

  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly stats = signal<{ chunks: number; sources: number } | null>(null);

  async loadIndex(): Promise<void> {
    if (this.manifest) return;
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Load manifest and vectors in parallel
      const [manifestRes, vectorsRes] = await Promise.all([
        this.ghFetch('manifest.json'),
        this.ghFetch('vectors.bin'),
      ]);

      if (!manifestRes.ok) throw new Error('Failed to load manifest.json');
      if (!vectorsRes.ok) throw new Error('Failed to load vectors.bin');

      this.manifest = await manifestRes.json();
      this.vectorDim = this.manifest!.vectorDim;
      this.dtype = this.manifest!.dtype || 'float32';

      // Parse binary vectors based on dtype
      const buffer = await vectorsRes.arrayBuffer();
      this.vectors = this.dtype === 'int8'
        ? new Int8Array(buffer)
        : new Float32Array(buffer);

      this.isLoaded.set(true);
      this.stats.set({
        chunks: this.manifest!.totalChunks,
        sources: this.manifest!.totalSources,
      });

      const vectorsKB = (buffer.byteLength / 1024).toFixed(1);
      console.log(`✅ Search index loaded: ${this.manifest!.totalChunks} chunks, ${this.manifest!.totalSources} sources (${this.dtype}, ${vectorsKB} KB)`);
    } catch (err: any) {
      this.error.set(err.message);
      console.error('❌ Failed to load search index:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fast cosine similarity search against all vectors.
   * For 7000 chunks × 384 dims, this runs in < 20ms.
   */
  async search(queryEmbedding: number[], topK = 5): Promise<SearchResult[]> {
    if (!this.manifest || !this.vectors) {
      throw new Error('Search index not loaded');
    }

    const numChunks = this.manifest.totalChunks;
    const dim = this.vectorDim;

    // Compute cosine similarity for all chunks
    const scores: Array<{ id: number; score: number }> = [];

    for (let i = 0; i < numChunks; i++) {
      const offset = i * dim;
      let dot = 0;

      if (this.dtype === 'int8') {
        // Int8 vectors: scale back to [-1, 1] range for dot product
        for (let j = 0; j < dim; j++) {
          dot += queryEmbedding[j] * ((this.vectors[offset + j] as number) / 127);
        }
      } else {
        // Float32 vectors: direct dot product
        for (let j = 0; j < dim; j++) {
          dot += queryEmbedding[j] * this.vectors[offset + j];
        }
      }

      scores.push({ id: i, score: dot });
    }

    // Sort by score descending and take top K
    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, topK);

    // Determine which source files we need to load
    const sourcesToLoad = new Set<string>();
    for (const result of topResults) {
      const chunk = this.manifest.chunks[result.id];
      sourcesToLoad.add(chunk.source);
    }

    // Lazy-load chunk text files (only the ones we need)
    await this.loadChunkTexts(Array.from(sourcesToLoad));

    // Build final results with full text
    const results: SearchResult[] = [];
    for (const result of topResults) {
      const chunkMeta = this.manifest.chunks[result.id];
      const text = this.getChunkText(chunkMeta.source, result.id);

      results.push({
        text: text || `[${chunkMeta.heading}] (text loading...)`,
        heading: chunkMeta.heading,
        source: chunkMeta.source,
        score: result.score,
      });
    }

    return results;
  }

  /**
   * Lazy-load chunk text files for specific sources.
   * Each source file is loaded once and cached.
   */
  private async loadChunkTexts(sources: string[]): Promise<void> {
    const toLoad = sources.filter(s => !this.chunkTextCache.has(s));

    if (toLoad.length === 0) return;

    const promises = toLoad.map(async (source) => {
      const filename = source.replace('.md', '.json');
      try {
        const res = await this.ghFetch(`chunks/${filename}`);
        if (res.ok) {
          const data: SourceChunkFile = await res.json();
          this.chunkTextCache.set(source, data);
        }
      } catch (err) {
        console.warn(`⚠️ Could not load chunks for ${source}:`, err);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get the text content of a specific chunk by source and global ID.
   */
  private getChunkText(source: string, globalId: number): string | null {
    const sourceData = this.chunkTextCache.get(source);
    if (!sourceData) return null;

    const chunk = sourceData.chunks.find(c => c.globalId === globalId);
    return chunk?.text || null;
  }
}
