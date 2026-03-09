import { TripPlan } from "@/contexts/ItineraryContext";

export type ChatMessage = { role: "user" | "assistant"; content: string };

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onToolCallStart?: (name: string) => void;
  onToolCallDone?: (name: string) => void;
  onToolCall: (name: string, args: any) => Promise<void> | void;
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
      if (line.trim() === "") continue;

      // Handle named SSE events (tool_start, tool_done)
      if (line.startsWith("event: ")) {
        const eventName = line.slice(7).trim();
        // Read the next data line for this event
        const nextNl = buffer.indexOf("\n");
        if (nextNl === -1) {
          // Put the event line back and wait for more data
          buffer = line + "\n" + buffer;
          break;
        }
        let dataLine = buffer.slice(0, nextNl);
        buffer = buffer.slice(nextNl + 1);
        if (dataLine.endsWith("\r")) dataLine = dataLine.slice(0, -1);

        if (dataLine.startsWith("data: ")) {
          try {
            const payload = JSON.parse(dataLine.slice(6).trim());
            if (eventName === "tool_start" && payload.name) {
              callbacks.onToolCallStart?.(payload.name);
            } else if (eventName === "tool_done" && payload.name) {
              callbacks.onToolCallDone?.(payload.name);
            }
          } catch {
            // ignore parse errors for event data
          }
        }
        continue;
      }

      if (line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        // If we accumulated a tool call, fire it and await
        if (toolCallName && toolCallArgs) {
          try {
            const parsed = JSON.parse(toolCallArgs);
            await callbacks.onToolCall(toolCallName, parsed);
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

        // Handle error finish reasons
        if (choice.finish_reason === "error") {
          console.error("Stream finish_reason error:", choice.native_finish_reason);
          callbacks.onError("AI failed to generate the itinerary. Please try again.");
          return;
        }

        const delta = choice.delta;
        if (delta?.content) {
          callbacks.onDelta(delta.content);
        }

        // Accumulate tool call chunks (only for create_itinerary forwarded from backend)
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              toolCallName = tc.function.name;
              // Don't fire onToolCallStart here — it's already handled by the named event
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
