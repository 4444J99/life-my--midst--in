/**
 * Artifact Classification Prompts
 *
 * Provides LLM prompts for three-tier artifact classification:
 * 1. LLM Analysis (primary - confidence 0.9-1.0)
 * 2. Heuristic Fallback (secondary - confidence 0.6-0.8)
 * 3. Manual Curation (tertiary - user override)
 *
 * The classification system aims to automatically categorize discovered creative
 * and academic artifacts into types like "academic_paper", "creative_writing",
 * "visual_art", "presentation", "video", "audio", "dataset", "code_sample", "other".
 */

import type { ChatMessage } from "../prompts";
import type { AgentExecutor, AgentTask } from "../agents";
import { randomUUID } from "node:crypto";

/**
 * Metadata extracted from a file for classification.
 */
export interface ExtractedMetadata {
  filename: string;
  mimeType: string;
  createdDate?: string;
  modifiedDate?: string;
  fileSize: number;
  textContent?: string;
  mediaMetadata?: Record<string, unknown>;
}

/**
 * System prompt for artifact classification.
 *
 * Instructs the LLM to classify artifacts based on content analysis and metadata.
 */
export const ARTIFACT_CLASSIFICATION_SYSTEM_PROMPT = `You are the Artifact Classifier, a specialist in analyzing creative and academic work to determine its type and key metadata.

Your goal is to analyze a discovered artifact and classify it into one of these categories:
- academic_paper: Scholarly articles, dissertations, research papers, theses, conference papers
- creative_writing: Fiction, poetry, essays, memoirs, short stories, creative nonfiction
- visual_art: Paintings, illustrations, photography, digital art, drawings, designs, graphics
- presentation: Slides, keynotes, talks, lectures, presentation decks, conference presentations
- video: Recorded talks, performances, documentaries, tutorials, video essays, lectures
- audio: Podcasts, music recordings, interviews, audio essays, radio shows
- dataset: Research data, collections, archives, databases, compiled datasets
- code_sample: Code repositories, scripts, algorithms, code snippets, software projects
- other: Novel or uncategorized artifact types that don't fit the above

When analyzing an artifact:
1. **Content Analysis**: Examine the extracted text content to understand the subject matter and purpose
2. **Metadata Clues**: Use filename, MIME type, creation date, file size, and extracted metadata
3. **Format Characteristics**: Consider structural features (e.g., slide count for presentations, EXIF data for images)
4. **Author Signals**: Look for author information, institutional affiliations, or publication markers
5. **Confidence Scoring**: Base confidence on how definitively the artifact matches a category

Return ONLY valid JSON matching the ArtifactClassificationResponse schema. Be precise and systematic.`;

/**
 * User prompt template for artifact classification.
 *
 * Accepts a filled object with artifact metadata and text content.
 *
 * @example
 * const prompt = buildArtifactClassificationPrompt({
 *   filename: "dissertation_2018.pdf",
 *   mimeType: "application/pdf",
 *   createdDate: "2018-05-15T00:00:00Z",
 *   modifiedDate: "2018-05-15T00:00:00Z",
 *   fileSize: 2500000,
 *   textContent: "Chapter 1: Introduction to...",
 *   mediaMetadata: {
 *     pageCount: 250,
 *     authorFromMetadata: "John Doe"
 *   }
 * });
 */
export function buildArtifactClassificationPrompt(data: ExtractedMetadata): string {
  const lines: string[] = [
    `Analyze and classify this artifact:`,
    ``,
    `**File Information:**`,
    `- Filename: ${data.filename}`,
    `- MIME Type: ${data.mimeType}`,
    `- File Size: ${formatFileSize(data.fileSize)}`,
    `- Created: ${data.createdDate || "unknown"}`,
    `- Modified: ${data.modifiedDate || "unknown"}`,
  ];

  if (data.mediaMetadata && Object.keys(data.mediaMetadata).length > 0) {
    lines.push(``, `**Extracted Metadata:**`);
    for (const [key, value] of Object.entries(data.mediaMetadata)) {
      lines.push(`- ${key}: ${formatMetadataValue(value)}`);
    }
  }

  if (data.textContent) {
    const truncated =
      data.textContent.length > 5000
        ? data.textContent.slice(0, 5000) + "..."
        : data.textContent;
    lines.push(
      ``,
      `**Text Content (first 5000 chars):**`,
      "```",
      truncated,
      "```"
    );
  }

  lines.push(
    ``,
    `Return JSON with this schema:`,
    `{`,
    `  "artifactType": "academic_paper" | "creative_writing" | "visual_art" | "presentation" | "video" | "audio" | "dataset" | "code_sample" | "other",`,
    `  "confidence": 0.0-1.0,`,
    `  "title": "inferred title or null",`,
    `  "summary": "1-2 sentence summary of content",`,
    `  "keywords": ["tag1", "tag2", "tag3"],`,
    `  "suggestedCategories": ["category1"],`,
    `  "suggestedTags": ["tag1", "tag2"],`,
    `  "reasoning": "brief explanation of classification"`,
    `}`
  );

  return lines.join("\n");
}

/**
 * Build complete artifact classification chat messages.
 *
 * @param data Artifact metadata and content
 * @returns Array of system + user chat messages ready for LLM
 */
export function buildArtifactClassificationMessages(data: ExtractedMetadata): ChatMessage[] {
  return [
    { role: "system", content: ARTIFACT_CLASSIFICATION_SYSTEM_PROMPT },
    { role: "user", content: buildArtifactClassificationPrompt(data) }
  ];
}

/**
 * Artifact classification response schema.
 *
 * Returned by LLM when classifying an artifact.
 */
export interface ArtifactClassificationResponse {
  artifactType:
    | "academic_paper"
    | "creative_writing"
    | "visual_art"
    | "presentation"
    | "video"
    | "audio"
    | "dataset"
    | "code_sample"
    | "other";
  confidence: number; // 0.0-1.0
  title?: string | null;
  summary?: string;
  keywords?: string[];
  suggestedCategories?: string[];
  suggestedTags?: string[];
  reasoning?: string;
}

/**
 * Helper: Format file size for readability.
 *
 * @example
 * formatFileSize(1048576) // "1.0 MB"
 * formatFileSize(1536) // "1.5 KB"
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Helper: Format metadata values for display.
 *
 * Handles various types (string, number, boolean, object, array).
 */
function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.length > 100 ? value.slice(0, 100) + "..." : value;
  }
  if (Array.isArray(value)) {
    return `[${value.slice(0, 3).join(", ")}${value.length > 3 ? ", ..." : ""}]`;
  }
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value);
      return str.length > 100 ? str.slice(0, 100) + "..." : str;
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

/**
 * Classify an artifact using the LLM.
 *
 * Wraps the prompt generation, execution, and response parsing.
 *
 * @param metadata Extracted file metadata
 * @param agentExecutor AgentExecutor instance to run the prompt
 * @returns Parsed and validated classification response
 * @throws Error if LLM response is invalid or execution fails
 */
export async function classifyWithLLM(
  metadata: ExtractedMetadata,
  agentExecutor: AgentExecutor
): Promise<ArtifactClassificationResponse> {
  const systemPrompt = ARTIFACT_CLASSIFICATION_SYSTEM_PROMPT;
  const userPrompt = buildArtifactClassificationPrompt(metadata);

  const task: AgentTask = {
    id: randomUUID(),
    role: "catcher", // Role is overridden by systemPromptOverride anyway
    description: `Classify artifact: ${metadata.filename}`,
    payload: {
      systemPromptOverride: systemPrompt,
      userPromptOverride: userPrompt,
      metadata
    }
  };

  const result = await agentExecutor.invoke(task);

  if (result.status === "failed") {
    throw new Error(`LLM classification failed: ${result.notes}`);
  }

  // Parse output
  // result.output might be the JSON if structured mode was used,
  // OR result.notes if text mode. 
  // But LocalLLMExecutor with 'structured-json' returns parsed object in output.
  // classifyWithLLM should probably enforce structured output?
  // LocalLLMExecutor configuration determines response format.
  
  // If result.output exists, use it. Otherwise try to parse notes.
  let parsed: unknown;
  if (result.output) {
    parsed = result.output;
  } else if (result.notes) {
    try {
      // Try to find JSON in notes
      const jsonMatch = result.notes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(result.notes);
      }
    } catch {
      throw new Error("Failed to parse LLM response as JSON");
    }
  } else {
    throw new Error("LLM response empty");
  }

  const response = parsed as ArtifactClassificationResponse;

  // Validate
  if (!response.artifactType) {
    throw new Error("Missing artifactType in response");
  }
  
  // Normalize type
  const validTypes = [
    "academic_paper",
    "creative_writing",
    "visual_art",
    "presentation",
    "video",
    "audio",
    "dataset",
    "code_sample",
    "other"
  ];
  if (!validTypes.includes(response.artifactType)) {
    response.artifactType = "other";
  }

  // Validate confidence
  if (typeof response.confidence !== "number") {
    response.confidence = 0.5;
  }
  // Clamp confidence to 0.0-1.0
  response.confidence = Math.max(0.0, Math.min(1.0, response.confidence));

  return response;
}
