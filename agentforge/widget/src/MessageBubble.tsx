import { h } from "preact";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageBubbleProps {
  message: Message;
  color: string;
}

function simpleMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export function MessageBubble({ message, color }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div
        class="af-widget-message user"
        style={{ background: color }}
      >
        {message.content}
      </div>
    );
  }

  return (
    <div
      class="af-widget-message assistant"
      dangerouslySetInnerHTML={{ __html: simpleMarkdown(message.content) }}
    />
  );
}
