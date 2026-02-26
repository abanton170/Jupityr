export interface WebhookEvent {
  type:
    | "conversation.started"
    | "conversation.ended"
    | "lead.captured"
    | "action.executed"
    | "escalation.triggered";
  agentId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Fire a webhook event to the given URL with retry logic.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 */
export async function fireWebhook(
  event: WebhookEvent,
  webhookUrl: string
): Promise<void> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AgentForge-Event": event.type,
          "X-AgentForge-Timestamp": event.timestamp,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(10000), // 10s timeout per attempt
      });

      if (response.ok) {
        return;
      }

      // Non-retryable client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(
          `[webhooks] Non-retryable error ${response.status} from ${webhookUrl} for event ${event.type}`
        );
        return;
      }

      // Retryable error — fall through to retry logic
      console.warn(
        `[webhooks] Attempt ${attempt}/${MAX_RETRIES} failed with status ${response.status} for ${event.type}`
      );
    } catch (error) {
      console.warn(
        `[webhooks] Attempt ${attempt}/${MAX_RETRIES} threw error for ${event.type}:`,
        error instanceof Error ? error.message : error
      );
    }

    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `[webhooks] All ${MAX_RETRIES} attempts failed for event ${event.type} to ${webhookUrl}`
  );
}

/**
 * Fire a webhook event to multiple URLs. Runs all in parallel.
 */
export async function fireWebhooks(
  event: WebhookEvent,
  webhookUrls: string[]
): Promise<void> {
  await Promise.allSettled(
    webhookUrls.map((url) => fireWebhook(event, url))
  );
}
