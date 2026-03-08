import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Sparkles,
  MapPin,
  Plane,
  Hotel,
  UtensilsCrossed,
  Compass,
  Globe,
  Bot,
  User,
  Loader2,
  Map,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useItinerary } from "@/contexts/ItineraryContext";
import { streamTravelChat, ChatMessage } from "@/lib/streamChat";
import { toast } from "sonner";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasItinerary?: boolean;
}

const suggestionChips = [
  { label: "Plan a 5-day trip to Tokyo", icon: Plane },
  { label: "Plan a 3-day trip to Paris with restaurants", icon: UtensilsCrossed },
  { label: "Plan a week in Bali with hidden gems", icon: Compass },
  { label: "Plan a romantic 4-day trip to Santorini", icon: Hotel },
];

export default function AiChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setTripPlan } = useItinerary();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Build conversation history for API
    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: messageText },
    ];

    let assistantContent = "";
    let gotItinerary = false;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id.startsWith("ai-")) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant" as const,
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    try {
      await streamTravelChat(history, {
        onDelta: (chunk) => upsertAssistant(chunk),
        onToolCall: (name, args) => {
          if (name === "create_itinerary") {
            gotItinerary = true;
            setTripPlan(args);
            toast.success("✨ Itinerary generated! View it on the Itinerary page.");
            // Mark the last assistant message
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, hasItinerary: true } : m
              )
            );
          }
        },
        onDone: () => {
          setIsTyping(false);
          if (!assistantContent && !gotItinerary) {
            upsertAssistant("I couldn't generate a response. Please try again.");
          }
        },
        onError: (error) => {
          setIsTyping(false);
          toast.error(error);
          upsertAssistant(`⚠️ ${error}`);
        },
      });
    } catch (e) {
      setIsTyping(false);
      toast.error("Failed to connect to AI service");
      upsertAssistant("⚠️ Failed to connect to AI service. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 pt-16 flex flex-col overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <motion.div
                className="text-center max-w-lg space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Your AI Travel Planner
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base">
                    Tell me where you want to go and I'll create a complete itinerary you can view on the map.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                  {suggestionChips.map((chip, i) => (
                    <motion.button
                      key={chip.label}
                      onClick={() => handleSend(chip.label)}
                      className="glass-panel rounded-xl p-4 text-left card-hover group"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <chip.icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-medium text-foreground">{chip.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tap to plan →</p>
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> 195+ countries
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Real AI planning
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Powered by Gemini
                  </span>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}

                    <div className="max-w-[80%] space-y-2">
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "glass-panel rounded-bl-md"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground">
                            {message.content.split("\n").map((line, i) => {
                              if (line.startsWith("## ")) return <h2 key={i}>{line.replace("## ", "")}</h2>;
                              if (line.startsWith("### ")) return <h3 key={i}>{line.replace("### ", "")}</h3>;
                              if (line.startsWith("- ")) return <p key={i} className="pl-2">{renderBold(line)}</p>;
                              if (line.trim() === "") return <div key={i} className="h-1" />;
                              return <p key={i}>{renderBold(line)}</p>;
                            })}
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                        <p className={`text-[10px] mt-2 ${message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      {/* View Itinerary CTA */}
                      {message.hasItinerary && (
                        <motion.button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full justify-center"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Map className="w-4 h-4" />
                          View Itinerary on Map
                        </motion.button>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-xl px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-panel rounded-2xl flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Plan a trip to Tokyo for 5 days…"
                rows={1}
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground resize-none outline-none px-3 py-2.5 max-h-32"
                style={{ minHeight: "40px" }}
              />
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Powered by AI · Itineraries auto-populate on the Itinerary page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
