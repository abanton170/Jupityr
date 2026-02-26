interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text: string;
    emoji?: boolean;
  }>;
}

/**
 * Send a message to a Slack incoming webhook.
 * Formats with Slack Block Kit for rich display.
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: string,
  channel?: string
): Promise<void> {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Sent by AgentForge`,
        },
      ],
    },
  ];

  const payload: Record<string, unknown> = {
    blocks,
    text: message, // Fallback for notifications
  };

  if (channel) {
    payload.channel = channel;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Slack webhook failed with status ${response.status}: ${body}`
    );
  }
}

/**
 * Send a rich notification about an agent event to Slack.
 */
export async function sendSlackAgentNotification(
  webhookUrl: string,
  options: {
    agentName: string;
    eventType: string;
    summary: string;
    details?: Record<string, string>;
    channel?: string;
  }
): Promise<void> {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `AgentForge: ${options.agentName}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${options.eventType}*\n${options.summary}`,
      },
    },
  ];

  if (options.details && Object.keys(options.details).length > 0) {
    const detailText = Object.entries(options.details)
      .map(([key, value]) => `*${key}:* ${value}`)
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: detailText,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Sent by AgentForge at ${new Date().toISOString()}`,
      },
    ],
  });

  const payload: Record<string, unknown> = {
    blocks,
    text: `${options.agentName}: ${options.eventType} - ${options.summary}`,
  };

  if (options.channel) {
    payload.channel = options.channel;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Slack webhook failed with status ${response.status}: ${body}`
    );
  }
}
