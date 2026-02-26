import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { ingestDataSource } from "@/lib/ingest";
import { prisma } from "@/lib/db";
import type { EmbeddingJobData } from "@/lib/queue";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Redis connection for the BullMQ worker.
 * Uses a dedicated connection (workers should not share connections with queues).
 */
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

/**
 * Process an embedding / ingestion job.
 */
async function processJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { sourceId, userId } = job.data;

  console.log(
    `[embedding.worker] Processing job ${job.id} — sourceId: ${sourceId}, userId: ${userId}`
  );

  try {
    await ingestDataSource(sourceId, userId);

    console.log(
      `[embedding.worker] Job ${job.id} completed successfully`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[embedding.worker] Job ${job.id} failed: ${message}`
    );

    // Ensure the data source is marked as FAILED
    try {
      await prisma.dataSource.update({
        where: { id: sourceId },
        data: {
          status: "FAILED",
          errorMsg: message,
        },
      });
    } catch (updateError) {
      console.error(
        `[embedding.worker] Failed to update DataSource status:`,
        updateError
      );
    }

    throw error; // Re-throw so BullMQ handles retries
  }
}

/**
 * BullMQ worker that listens on the 'embedding' queue.
 */
const worker = new Worker<EmbeddingJobData>("embedding", processJob, {
  connection,
  concurrency: 3,
  limiter: {
    max: 10,
    duration: 60000, // Max 10 jobs per minute (respects OpenAI rate limits)
  },
});

worker.on("completed", (job) => {
  console.log(`[embedding.worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[embedding.worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
    err.message
  );
});

worker.on("error", (err) => {
  console.error("[embedding.worker] Worker error:", err);
});

console.log("[embedding.worker] Worker started, listening on 'embedding' queue");

export default worker;
