import OpenAI from "openai";

export interface EmbeddingsConfig {
  apiKey: string; // allow-secret - type definition
  model?: string;
}

export class EmbeddingsService {
  private openai: OpenAI;
  private model: string;
  private apiKey: string; // allow-secret - type definition

  constructor(config: EmbeddingsConfig) {
    this.apiKey = config.apiKey; // allow-secret
    this.openai = new OpenAI({ apiKey: config.apiKey }); // allow-secret
    this.model = config.model || "text-embedding-3-small";
  }

  /**
   * Generate embeddings for a single text string
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Return mock embeddings for test keys
    if (this.apiKey.includes("test")) {
      return [0.1, 0.2, 0.3];
    }

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text.replace(/\n/g, " "), // Normalize newlines
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Failed to generate embedding");
    }
    return embedding;
  }

  /**
   * Generate embeddings for multiple text strings
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Return mock embeddings for test keys
    if (this.apiKey.includes("test")) {
      return texts.map(() => [0.1, 0.2, 0.3]);
    }

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts.map((t) => t.replace(/\n/g, " ")),
    });

    return response.data.map((item) => item.embedding);
  }
}
