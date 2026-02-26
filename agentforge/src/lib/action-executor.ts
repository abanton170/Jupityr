import { type Action, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

interface ActionResult {
  success: boolean;
  result: unknown;
  error?: string;
}

/**
 * Execute an action with the given parameters.
 * Routes to the appropriate handler based on the action type.
 */
export async function executeAction(
  action: Action,
  params: Record<string, unknown>
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "CUSTOM_API":
        return await executeCustomApi(action, params);
      case "COLLECT_LEAD":
        return await executeCollectLead(action, params);
      case "SLACK_NOTIFY":
        return await executeSlackNotify(action, params);
      case "WEB_SEARCH":
        return executeWebSearch(params);
      case "CUSTOM_BUTTON":
        return executeCustomButton(action);
      case "CALENDLY":
        return executeCalendly(action);
      default:
        return {
          success: false,
          result: null,
          error: `Unknown action type: ${action.type}`,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Action execution failed";
    console.error(`Action execution error [${action.type}]:`, error);
    return { success: false, result: null, error: message };
  }
}

/**
 * CUSTOM_API: Make an HTTP request to the configured endpoint.
 */
async function executeCustomApi(
  action: Action,
  params: Record<string, unknown>
): Promise<ActionResult> {
  if (!action.endpointUrl) {
    return { success: false, result: null, error: "No endpoint URL configured" };
  }

  const method = (action.httpMethod || "POST").toUpperCase();
  const configuredHeaders = (action.headers as Record<string, string>) || {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...configuredHeaders,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  let url = action.endpointUrl;

  if (method === "GET") {
    // Append params as query string for GET requests
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.set(key, String(value));
    }
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  } else {
    // Send params as JSON body for POST/PUT/DELETE
    fetchOptions.body = JSON.stringify(params);
  }

  const response = await fetch(url, fetchOptions);
  let responseData: unknown;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    return {
      success: false,
      result: responseData,
      error: `API returned status ${response.status}`,
    };
  }

  return { success: true, result: responseData };
}

/**
 * COLLECT_LEAD: Save lead data to the database.
 */
async function executeCollectLead(
  action: Action,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const name = typeof params.name === "string" ? params.name : null;
  const email = typeof params.email === "string" ? params.email : null;
  const phone = typeof params.phone === "string" ? params.phone : null;
  const company = typeof params.company === "string" ? params.company : null;

  // Extract any additional fields into customFields
  const knownFields = new Set(["name", "email", "phone", "company"]);
  const customFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!knownFields.has(key)) {
      customFields[key] = value;
    }
  }

  const lead = await prisma.lead.create({
    data: {
      agentId: action.agentId,
      name,
      email,
      phone,
      company,
      customFields:
        Object.keys(customFields).length > 0
          ? (JSON.parse(JSON.stringify(customFields)) as Prisma.InputJsonValue)
          : undefined,
    },
  });

  return {
    success: true,
    result: {
      message: "Lead information has been saved successfully.",
      leadId: lead.id,
    },
  };
}

/**
 * SLACK_NOTIFY: Send a message to a Slack webhook.
 */
async function executeSlackNotify(
  action: Action,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const config = action.config as Record<string, unknown> | null;
  const webhookUrl = config?.webhookUrl as string | undefined;

  if (!webhookUrl) {
    return {
      success: false,
      result: null,
      error: "No Slack webhook URL configured",
    };
  }

  const message = typeof params.message === "string" ? params.message : "";
  const channel = config?.channel as string | undefined;

  const payload: Record<string, unknown> = {
    text: message,
  };
  if (channel) {
    payload.channel = channel;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      success: false,
      result: text,
      error: `Slack webhook returned status ${response.status}`,
    };
  }

  return {
    success: true,
    result: { message: "Notification sent to Slack successfully." },
  };
}

/**
 * WEB_SEARCH: Return a placeholder message indicating search is being performed.
 */
function executeWebSearch(
  params: Record<string, unknown>
): ActionResult {
  const query = typeof params.query === "string" ? params.query : "";

  return {
    success: true,
    result: {
      message: `Web search results are being fetched for: "${query}". This is a placeholder - integrate a search API (SerpAPI, Tavily, etc.) for real results.`,
      query,
    },
  };
}

/**
 * CUSTOM_BUTTON: Return button data for rendering in the chat UI.
 */
function executeCustomButton(action: Action): ActionResult {
  const config = action.config as Record<string, unknown> | null;

  return {
    success: true,
    result: {
      type: "button",
      text: (config?.buttonText as string) || "Click Here",
      url: (config?.buttonUrl as string) || "#",
      target: (config?.target as string) || "_blank",
    },
  };
}

/**
 * CALENDLY: Return the Calendly scheduling link.
 */
function executeCalendly(action: Action): ActionResult {
  const config = action.config as Record<string, unknown> | null;
  const calendlyUrl = (config?.calendlyUrl as string) || "";

  if (!calendlyUrl) {
    return {
      success: false,
      result: null,
      error: "No Calendly URL configured",
    };
  }

  return {
    success: true,
    result: {
      type: "calendly",
      url: calendlyUrl,
      message: `You can schedule a meeting using this link: ${calendlyUrl}`,
    },
  };
}
