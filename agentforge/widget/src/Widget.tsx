import { h, Fragment } from "preact";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { MessageBubble } from "./MessageBubble";

interface AgentConfig {
  name: string;
  primaryColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  avatarUrl?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface WidgetProps {
  agentId: string;
  baseUrl: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getSessionId(agentId: string): string {
  const key = `af_session_${agentId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function Widget({ agentId, baseUrl }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useRef(getSessionId(agentId));

  useEffect(() => {
    fetch(`${baseUrl}/api/widget/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        // Load cached messages
        const cached = localStorage.getItem(`af_messages_${agentId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              setShowSuggestions(false);
            }
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => console.error("AgentForge: Failed to load config", err));
  }, [agentId, baseUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`af_messages_${agentId}`, JSON.stringify(messages));
    }
  }, [messages, agentId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { id: generateId(), role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setShowSuggestions(false);
      setIsLoading(true);

      const assistantId = generateId();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      try {
        const res = await fetch(`${baseUrl}/api/widget/${agentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            sessionId: sessionId.current,
          }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + parsed.text }
                        : m
                    )
                  );
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      } catch (err) {
        console.error("AgentForge: Chat error", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I encountered an error. Please try again." }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, baseUrl, isLoading]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!config) return null;

  const position = config.position || "bottom-right";
  const color = config.primaryColor || "#6366f1";

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div class={`af-widget-panel ${position}`}>
          {/* Header */}
          <div class="af-widget-header" style={{ background: color }}>
            <div class="af-widget-header-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div class="af-widget-header-info">
              <h3>{config.name}</h3>
              <p>Online</p>
            </div>
            <button class="af-widget-close" onClick={() => setIsOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div class="af-widget-messages">
            {/* Welcome message */}
            {messages.length === 0 && config.welcomeMessage && (
              <div class="af-widget-message assistant">
                {config.welcomeMessage}
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                color={color}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div class="af-widget-typing">
                <span />
                <span />
                <span />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {showSuggestions &&
            config.suggestedQuestions &&
            config.suggestedQuestions.length > 0 && (
              <div class="af-widget-suggestions">
                {config.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    class="af-widget-suggestion"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

          {/* Input */}
          <div class="af-widget-input-area">
            <textarea
              ref={inputRef}
              class="af-widget-input"
              placeholder="Type your message..."
              value={input}
              rows={1}
              onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
            />
            <button
              class="af-widget-send"
              style={{ background: color }}
              disabled={!input.trim() || isLoading}
              onClick={() => sendMessage(input)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          <div class="af-widget-powered">
            Powered by AgentForge
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        class={`af-widget-trigger ${position}`}
        style={{ background: color }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
