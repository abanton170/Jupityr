import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Shared Redis connection for BullMQ.
 * Uses lazy initialization to avoid connecting when not needed.
 */
let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
  }
  return redisConnection;
}

/**
 * BullMQ queue for embedding / ingestion jobs.
 */
let embeddingQueue: Queue | null = null;

export function getEmbeddingQueue(): Queue {
  if (!embeddingQueue) {
    embeddingQueue = new Queue("embedding", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });
  }
  return embeddingQueue;
}

export interface EmbeddingJobData {
  sourceId: string;
  userId: string;
}

/**
 * Add a data source ingestion job to the embedding queue.
 */
export async function queueEmbeddingJob(
  sourceId: string,
  userId: string
): Promise<void> {
  const queue = getEmbeddingQueue();
  await queue.add(
    "ingest",
    { sourceId, userId } satisfies EmbeddingJobData,
    {
      jobId: `ingest-${sourceId}`,
    }
  );
}
