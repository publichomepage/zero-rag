import { Injectable, signal } from '@angular/core';
import type { SearchResult } from './search.service';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  size: string;
}

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 (360M)',
    description: 'Extremely small and fast (<300MB).',
    size: '250MB'
  },
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    name: 'Qwen 3 (0.6B)',
    description: 'Latest Qwen architecture (~450MB).',
    size: '450MB'
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (1B)',
    description: 'Meta\'s elite 1B instruction model (~850MB).',
    size: '850MB'
  }
];

@Injectable({ providedIn: 'root' })
export class LlmService {
  private engine: any = null;
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly loadProgress = signal('');
  readonly webGPUSupported = signal(true);
  readonly selectedModelId = signal(SUPPORTED_MODELS[0].id);

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('selectedModel');
      if (saved && SUPPORTED_MODELS.find(m => m.id === saved)) {
        this.selectedModelId.set(saved);
      }
    }
  }

  async checkWebGPU(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        this.webGPUSupported.set(false);
        return false;
      }
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        this.webGPUSupported.set(false);
        return false;
      }
      return true;
    } catch {
      this.webGPUSupported.set(false);
      return false;
    }
  }

  async switchModel(modelId: string): Promise<void> {
    if (this.selectedModelId() === modelId && this.engine) return;

    this.selectedModelId.set(modelId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedModel', modelId);
    }
    this.isLoaded.set(false);

    if (this.engine) {
      this.loadProgress.set('Unloading previous model...');
      await this.engine.unload();
      this.engine = null;
    }

    await this.loadModel();
  }

  async loadModel(): Promise<void> {
    if (this.engine) return;

    const hasGPU = await this.checkWebGPU();
    if (!hasGPU) {
      this.loadProgress.set('WebGPU not supported — LLM unavailable');
      return;
    }

    this.isLoading.set(true);
    this.loadProgress.set(`Initializing ${this.selectedModelId()}...`);

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      const shortName = this.selectedModelId().split('-')[0];
      this.engine = await CreateMLCEngine(this.selectedModelId(), {
        initProgressCallback: (progress: any) => {
          this.loadProgress.set(progress.text || 'Loading...');
        },
      });

      this.isLoaded.set(true);
      this.loadProgress.set('LLM ready');
      console.log(`✅ LLM loaded: ${shortName}`);
    } catch (err: any) {
      this.loadProgress.set(`LLM Error: ${err.message}`);
      console.error('❌ Failed to load LLM:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  buildPrompt(
    question: string,
    context: SearchResult[],
    history: Array<{ role: string; content: string }> = []
  ): Array<{ role: string; content: string }> {
    const contextText = context
      .slice(0, 3)
      .map((c) => `[${c.source}]\n${c.text.substring(0, 1500)}`)
      .join('\n\n');

    const messages = [
      {
        role: 'system',
        content: `You are a concise documentation assistant.
Rules:
- Answer in 2-3 sentences.
- If the context contains code, include it.
- Do NOT repeat the question or the word "Question:".
- Use ONLY the provided context. If the answer isn't there, say you don't know.`
      },
      ...history.map(h => ({
        role: h.role,
        content: h.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      })).filter(h => h.content.length > 0),
      {
        role: 'user',
        content: `Context:\n${contextText || 'No context available.'}\n\nTask: Use the context above to answer this question: ${question}`
      },
    ];

    return messages;
  }

  async *generateStream(
    question: string,
    context: SearchResult[],
    history: Array<{ role: string; content: string }> = []
  ): AsyncGenerator<string> {
    if (!this.engine) {
      yield 'LLM not loaded. Showing search results only.';
      return;
    }

    const messages = this.buildPrompt(question, context, history);

    try {
      const completion = await this.engine.chat.completions.create({
        stream: true,
        messages,
        max_tokens: 1500,
        temperature: 0.1,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });

      let fullText = '';
      let outputLength = 0;
      let lastChunk = '';
      let repeatCount = 0;

      for await (const chunk of completion) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          if (delta === lastChunk && delta.trim().length > 2) {
            repeatCount++;
            if (repeatCount >= 3) break;
          } else {
            repeatCount = 0;
          }
          lastChunk = delta;
          fullText += delta;

          // Skip everything until </think> is found (if model is thinking)
          if (fullText.includes('<think>') && !fullText.includes('</think>')) {
            continue; // still thinking, don't yield yet
          }

          // Once thinking is done, extract only the part after </think>
          let toYield = delta;
          if (fullText.includes('</think>')) {
            const afterThink = fullText.substring(fullText.lastIndexOf('</think>') + 8);
            if (outputLength === 0) {
              // First yield: send everything after </think>
              toYield = afterThink.trimStart();
              if (!toYield) continue;
            }
          }

          yield toYield;
          outputLength += toYield.length;
          if (outputLength > 1500) break;
        }
      }
    } catch (err: any) {
      yield `Error: ${err.message}`;
    }
  }

  async generate(
    question: string,
    context: SearchResult[],
    history: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    let result = '';
    for await (const chunk of this.generateStream(question, context, history)) {
      result += chunk;
    }
    return result;
  }

  // Engine getter for external utilities like tool-methods.ts
  getEngine() {
    return this.engine;
  }
}
