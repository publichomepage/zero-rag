import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EmbeddingService {
  private extractor: any = null;
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly loadProgress = signal('');

  async loadModel(): Promise<void> {
    if (this.extractor) return;
    this.isLoading.set(true);
    this.loadProgress.set('Loading embedding model...');

    try {
      // Dynamic import to avoid bundling issues
      const { pipeline } = await import('@huggingface/transformers');

      this.loadProgress.set('Downloading Xenova/all-MiniLM-L6-v2...');
      this.extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          dtype: 'fp32',
        }
      );

      this.isLoaded.set(true);
      this.loadProgress.set('Embedding model ready');
      console.log('✅ Embedding model loaded');
    } catch (err: any) {
      this.loadProgress.set(`Error: ${err.message}`);
      console.error('❌ Failed to load embedding model:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.extractor) throw new Error('Embedding model not loaded');

    const result = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(result.data as Float32Array);
  }
}
