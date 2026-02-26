import { h, render } from "preact";
import { Widget } from "./Widget";

function init() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const agentId = script.getAttribute("data-agent-id");
  if (!agentId) {
    console.error("AgentForge Widget: data-agent-id attribute is required");
    return;
  }

  // Determine the API base URL from the script src
  const scriptSrc = script.getAttribute("src") || "";
  let baseUrl = "";
  try {
    const url = new URL(scriptSrc);
    baseUrl = url.origin;
  } catch {
    // If relative URL, use current origin
    baseUrl = window.location.origin;
  }

  // Create shadow DOM container
  const container = document.createElement("div");
  container.id = "agentforge-widget-root";
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: "open" });

  // Inject styles
  const styleEl = document.createElement("style");
  // @ts-expect-error - CSS imported as text via esbuild loader
  const cssText: string = require("./styles.css");
  styleEl.textContent = cssText;
  shadow.appendChild(styleEl);

  // Create render target
  const app = document.createElement("div");
  shadow.appendChild(app);

  render(
    <Widget agentId={agentId} baseUrl={baseUrl} />,
    app
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
