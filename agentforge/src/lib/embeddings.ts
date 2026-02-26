const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OPENAI_EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;
const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code: string | null;
  };
}

/**
 * Generate an embedding vector for a single text string.
 */
export async function embedText(
  text: string,
  openaiKey: string
): Promise<number[]> {
  const results = await embedTexts([text], openaiKey);
  return results[0];
}

/**
 * Generate embedding vectors for multiple texts.
 * Batches requests to respect the OpenAI API limit of 100 items per call.
 */
export async function embedTexts(
  texts: string[],
  openaiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = new Array(texts.length);

  // Process in batches of MAX_BATCH_SIZE
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const batchEmbeddings = await fetchEmbeddings(batch, openaiKey);

    for (let j = 0; j < batchEmbeddings.length; j++) {
      allEmbeddings[i + j] = batchEmbeddings[j];
    }
  }

  return allEmbeddings;
}

async function fetchEmbeddings(
  texts: string[],
  openaiKey: string
): Promise<number[][]> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: OPENAI_EMBEDDING_MODEL,
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as OpenAIErrorResponse | null;
    const message = errorBody?.error?.message ?? response.statusText;

    if (response.status === 401) {
      throw new Error(`Invalid OpenAI API key: ${message}`);
    }
    if (response.status === 429) {
      throw new Error(`OpenAI rate limit exceeded: ${message}`);
    }
    throw new Error(`OpenAI embedding request failed (${response.status}): ${message}`);
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;

  // Sort by index to ensure correct ordering
  const sorted = data.data.sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
}
