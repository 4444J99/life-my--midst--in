import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import type { Agent, AgentTask, AgentResult } from "../agents";
import { embedText } from "../llm";
import { loadLLMConfig } from "../config";

export class CrawlerAgent implements Agent {
  role: "crawler" = "crawler";

  async execute(task: AgentTask): Promise<AgentResult> {
    const { basePath, filters, depth = 5 } = task.payload as {
      basePath: string;
      filters?: string[];
      depth?: number;
    };

    if (!basePath) {
      return { taskId: task.id, status: "failed", notes: "missing_base_path" };
    }

    try {
      const files = await this.crawl(basePath, depth, filters);
      const processed = await this.processFiles(files);
      
      return {
        taskId: task.id,
        status: "completed",
        notes: `Crawled ${files.length} files. Processed ${processed.length} content blocks.`,
        output: {
          manifest: files,
          blocks: processed
        }
      };
    } catch (err) {
      return {
        taskId: task.id,
        status: "failed",
        notes: `crawl_error: ${String(err)}`
      };
    }
  }

  private async crawl(dir: string, maxDepth: number, filters?: string[]): Promise<string[]> {
    const results: string[] = [];
    
    async function traverse(currentDir: string, currentDepth: number) {
      if (currentDepth > maxDepth) return;
      
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          await traverse(fullPath, currentDepth + 1);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (!filters || filters.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    }

    await traverse(dir, 0);
    return results;
  }

  private async processFiles(paths: string[]) {
    const llmConfig = loadLLMConfig();
    const blocks: Array<{ path: string; content: string; embedding?: number[] }> = [];

    for (const path of paths) {
      try {
        const content = await readFile(path, "utf-8");
        // Simple chunking or just per file for now
        // In real RAG we'd chunk here.
        const embedding = await embedText(content.slice(0, 2000), llmConfig);
        
        blocks.push({
          path,
          content: content.slice(0, 5000), // Truncate content for manifest
          embedding
        });
      } catch (err) {
        console.warn(`Failed to process ${path}: ${String(err)}`);
      }
    }
    return blocks;
  }
}
