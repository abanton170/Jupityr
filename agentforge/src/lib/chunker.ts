export interface ChunkResult {
  content: string;
  tokenCount: number;
  position: number;
}

interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

/**
 * Rough token estimate: each whitespace-delimited word is ~1.3 tokens.
 */
function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

/**
 * Split a long paragraph into sentences using common sentence-ending punctuation.
 */
function splitBySentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const parts = text.split(/(?<=[.?!])\s+/);
  return parts.filter((s) => s.trim().length > 0);
}

/**
 * Split text into chunks of approximately `maxTokens` tokens with `overlapTokens`
 * tokens of overlap between consecutive chunks.
 *
 * Strategy:
 *  1. Split by paragraph boundaries (double newlines).
 *  2. Accumulate paragraphs until reaching maxTokens.
 *  3. For paragraphs that individually exceed maxTokens, split by sentence.
 *  4. When a chunk is full, start the next one with overlap from the tail of
 *     the previous chunk.
 */
export function chunkText(text: string, options?: ChunkOptions): ChunkResult[] {
  const maxTokens = options?.maxTokens ?? 500;
  const overlapTokens = options?.overlapTokens ?? 100;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split into paragraphs by double newline
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // Build a flat list of "segments" — paragraphs or sentences for long paragraphs
  const segments: string[] = [];
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (estimateTokens(trimmed) > maxTokens) {
      // Break large paragraphs into sentences
      const sentences = splitBySentences(trimmed);
      segments.push(...sentences);
    } else {
      segments.push(trimmed);
    }
  }

  if (segments.length === 0) {
    return [];
  }

  const chunks: ChunkResult[] = [];
  let currentSegments: string[] = [];
  let currentTokens = 0;

  for (const segment of segments) {
    const segTokens = estimateTokens(segment);

    // If adding this segment would exceed the limit, finalize the current chunk
    if (currentSegments.length > 0 && currentTokens + segTokens > maxTokens) {
      const content = currentSegments.join("\n\n");
      chunks.push({
        content,
        tokenCount: estimateTokens(content),
        position: chunks.length,
      });

      // Build overlap: take segments from the end of the current chunk
      // until we reach overlapTokens
      const overlapSegments: string[] = [];
      let overlapCount = 0;
      for (let i = currentSegments.length - 1; i >= 0; i--) {
        const t = estimateTokens(currentSegments[i]);
        if (overlapCount + t > overlapTokens && overlapSegments.length > 0) {
          break;
        }
        overlapSegments.unshift(currentSegments[i]);
        overlapCount += t;
      }

      currentSegments = overlapSegments;
      currentTokens = overlapCount;
    }

    currentSegments.push(segment);
    currentTokens += segTokens;
  }

  // Finalize the last chunk
  if (currentSegments.length > 0) {
    const content = currentSegments.join("\n\n");
    chunks.push({
      content,
      tokenCount: estimateTokens(content),
      position: chunks.length,
    });
  }

  return chunks;
}
