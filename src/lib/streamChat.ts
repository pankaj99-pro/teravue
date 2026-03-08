import { TripPlan } from "@/contexts/ItineraryContext";

export type ChatMessage = { role: "user" | "assistant"; content: string };

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onToolCallStart?: (name: string) => void;
  onToolCall: (name: string, args: any) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-chat`;

export async function streamTravelChat(messages: ChatMessage[], callbacks: StreamCallbacks) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Request failed" }));
    callbacks.onError(errorData.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    callbacks.onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let toolCallName = "";
  let toolCallArgs = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        // If we accumulated a tool call, fire it
        if (toolCallName && toolCallArgs) {
          try {
            const parsed = JSON.parse(toolCallArgs);
            callbacks.onToolCall(toolCallName, parsed);
          } catch {
            console.error("Failed to parse tool call args:", toolCallArgs);
          }
        }
        callbacks.onDone();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);

        // Handle SSE error chunks from provider
        if (parsed.error) {
          console.error("SSE stream error:", parsed.error);
          callbacks.onError(parsed.error.message || "AI provider error. Please try again.");
          return;
        }

        const choice = parsed.choices?.[0];
        if (!choice) continue;

        // Handle error finish reasons (e.g. MALFORMED_FUNCTION_CALL from Gemini)
        if (choice.finish_reason === "error") {
          console.error("Stream finish_reason error:", choice.native_finish_reason);
          callbacks.onError("AI failed to generate the itinerary. Please try again.");
          return;
        }

        const delta = choice.delta;
        if (delta?.content) {
          callbacks.onDelta(delta.content);
        }

        // Accumulate tool call chunks
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              toolCallName = tc.function.name;
              callbacks.onToolCallStart?.(toolCallName);
            }
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          }
        }
      } catch {
        // Partial JSON, put back
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // Final flush
  if (toolCallName && toolCallArgs) {
    try {
      callbacks.onToolCall(toolCallName, JSON.parse(toolCallArgs));
    } catch {
      console.error("Failed to parse tool call args on flush");
    }
  }
  callbacks.onDone();
}
