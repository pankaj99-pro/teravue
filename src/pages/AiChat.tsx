import { useState, useRef, useEffect, useCallback } from "react";
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
  Map as MapIcon,
  Wand2,
  Check,
  Circle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ChatSidebar, ChatSession } from "@/components/ChatSidebar";
import { AgentActivityPanel } from "@/components/AgentActivityPanel";
import { useItinerary } from "@/contexts/ItineraryContext";
import { useAuth } from "@/contexts/AuthContext";
import { streamTravelChat, ChatMessage } from "@/lib/streamChat";
import { saveTripToDatabase } from "@/lib/tripStorage";
import { normalizeTripPlan } from "@/lib/itineraryNormalizer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolCallStatus {
  name: string;
  status: "pending" | "running" | "done" | "error";
}

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasItinerary?: boolean;
  toolCalls?: ToolCallStatus[];
}

interface StoredSession {
  id: string;
  dbId?: string; // database UUID
  title: string;
  messages: UIMessage[];
  createdAt: Date;
  hasItinerary: boolean;
  tripDestination?: string;
}

const suggestionChips = [
  { label: "Plan a 5-day trip to Tokyo", icon: Plane },
  { label: "Plan a 3-day trip to Paris with restaurants", icon: UtensilsCrossed },
  { label: "Plan a week in Bali with hidden gems", icon: Compass },
  { label: "Plan a romantic 4-day trip to Santorini", icon: Hotel },
];

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_flights: "Searching Flights",
  search_hotels: "Finding Hotels",
  search_restaurants: "Discovering Restaurants",
  search_attractions: "Finding Attractions",
  create_itinerary: "Building Itinerary",
};

export default function AiChat() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentTripId, setAgentTripId] = useState<string | null>(null);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallStatus[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setTripPlan } = useItinerary();
  const { user } = useAuth();
  const loadedRef = useRef(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeToolCalls]);

  // Load sessions from DB on mount
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data: dbSessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!dbSessions?.length) return;

      const { data: dbMessages } = await supabase
        .from("chat_messages")
        .select("*")
        .in("session_id", dbSessions.map((s: any) => s.id))
        .order("created_at", { ascending: true });

      const msgsBySession = new Map<string, UIMessage[]>();
      for (const m of dbMessages || []) {
        const arr = msgsBySession.get(m.session_id) || [];
        arr.push({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
          hasItinerary: m.has_itinerary,
          toolCalls: m.tool_calls ? (m.tool_calls as any[]).map((tc: any) => ({ name: tc.name, status: tc.status as ToolCallStatus["status"] })) : undefined,
        });
        msgsBySession.set(m.session_id, arr);
      }

      const loaded: StoredSession[] = dbSessions.map((s: any) => ({
        id: s.id,
        dbId: s.id,
        title: s.title,
        messages: msgsBySession.get(s.id) || [],
        createdAt: new Date(s.created_at),
        hasItinerary: s.has_itinerary,
        tripDestination: s.trip_destination,
      }));
      setSessions(loaded);
    })();
  }, [user]);

  const createSession = useCallback(async (firstMessage: string): Promise<string> => {
    const localId = Date.now().toString();
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "…" : firstMessage;

    let dbId: string | undefined;
    if (user) {
      const { data } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (data) dbId = data.id;
    }

    const newSession: StoredSession = {
      id: dbId || localId,
      dbId,
      title,
      messages: [],
      createdAt: new Date(),
      hasItinerary: false,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [user]);

  const updateSessionMessages = useCallback((sessionId: string, updater: (msgs: UIMessage[]) => UIMessage[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages: updater(s.messages) } : s
      )
    );
  }, []);

  const saveMessageToDB = async (sessionId: string, msg: { role: string; content: string; hasItinerary?: boolean; toolCalls?: ToolCallStatus[] }) => {
    const session = sessions.find((s) => s.id === sessionId);
    const dbSessionId = session?.dbId || sessionId;
    if (!user) return;
    await supabase.from("chat_messages").insert({
      session_id: dbSessionId,
      role: msg.role,
      content: msg.content,
      has_itinerary: msg.hasItinerary || false,
      tool_calls: msg.toolCalls ? JSON.parse(JSON.stringify(msg.toolCalls)) : [],
    });
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleDeleteSession = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session?.dbId) {
      await supabase.from("chat_sessions").delete().eq("id", session.dbId);
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
    toast.info("Chat deleted");
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(messageText);
    }

    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    updateSessionMessages(sessionId, (msgs) => [...msgs, userMessage]);
    setInput("");
    setIsTyping(true);
    setActiveToolCalls([]);

    // Save user message to DB
    saveMessageToDB(sessionId, { role: "user", content: messageText });

    // Build conversation history
    const currentMsgs = sessions.find((s) => s.id === sessionId)?.messages || [];
    const history: ChatMessage[] = [
      ...currentMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: messageText },
    ];

    let assistantContent = "";
    const assistantId = `ai-${Date.now()}`;
    let finalToolCalls: ToolCallStatus[] = [];

    let assistantMessageCreated = false;

    const ensureAssistantMessage = (content: string) => {
      updateSessionMessages(sessionId!, (msgs) => {
        const existing = msgs.find((m) => m.id === assistantId);
        if (existing) {
          return msgs.map((m) => (m.id === assistantId ? { ...m, content } : m));
        }
        assistantMessageCreated = true;
        return [...msgs, { id: assistantId, role: "assistant" as const, content, timestamp: new Date() }];
      });
    };

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      ensureAssistantMessage(assistantContent);
    };

    try {
      await streamTravelChat(history, {
        onDelta: (chunk) => upsertAssistant(chunk),
        onToolCallStart: (name) => {
          const tc: ToolCallStatus = { name, status: "running" };
          setActiveToolCalls((prev) => [...prev, tc]);
          finalToolCalls = [...finalToolCalls, tc];
          // Create assistant message placeholder if none exists yet
          if (!assistantContent) {
            ensureAssistantMessage("");
          }
        },
        onToolCallDone: (name) => {
          // Mark research tools as done (not create_itinerary — that's handled in onToolCall)
          if (name !== "create_itinerary") {
            setActiveToolCalls((prev) =>
              prev.map((tc) => tc.name === name && tc.status === "running" ? { ...tc, status: "done" } : tc)
            );
            finalToolCalls = finalToolCalls.map((tc) =>
              tc.name === name && tc.status === "running" ? { ...tc, status: "done" } : tc
            );
          }
        },
        onToolCall: async (name, args) => {
          // Mark this tool as done
          setActiveToolCalls((prev) =>
            prev.map((tc) => tc.name === name && tc.status === "running" ? { ...tc, status: "done" } : tc)
          );
          finalToolCalls = finalToolCalls.map((tc) =>
            tc.name === name && tc.status === "running" ? { ...tc, status: "done" } : tc
          );

          if (name === "create_itinerary") {
            const normalizedPlan = normalizeTripPlan(args);
            let savedTripId: string | undefined;

            if (user) {
              const tripId = await saveTripToDatabase(normalizedPlan, user.id);
              if (tripId) {
                savedTripId = tripId;
                normalizedPlan.tripId = tripId;
              }
            }

            setTripPlan(normalizedPlan);
            toast.success(savedTripId
              ? "✨ Itinerary generated and saved! View it on the Itinerary page."
              : "✨ Itinerary generated! Sign in to save your trips."
            );
            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      hasItinerary: true,
                      tripDestination: normalizedPlan.destination,
                      messages: s.messages.map((m) =>
                        m.id === assistantId ? { ...m, hasItinerary: true, toolCalls: finalToolCalls } : m
                      ),
                    }
                  : s
              )
            );

            // Update session in DB
            if (user) {
              const session = sessions.find((s) => s.id === sessionId);
              if (session?.dbId) {
                await supabase.from("chat_sessions").update({
                  has_itinerary: true,
                  trip_destination: normalizedPlan.destination,
                  updated_at: new Date().toISOString(),
                }).eq("id", session.dbId);
              }
            }
          }
        },
        onDone: () => {
          setIsTyping(false);

          // Ensure the assistant message has tool call info attached
          if (finalToolCalls.length > 0) {
            updateSessionMessages(sessionId!, (msgs) =>
              msgs.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: finalToolCalls }
                  : m
              )
            );
          }

          // Save assistant message to DB
          const hasItinerary = finalToolCalls.some((tc) => tc.name === "create_itinerary" && tc.status === "done");
          saveMessageToDB(sessionId!, {
            role: "assistant",
            content: assistantContent || (hasItinerary ? "Your itinerary has been created!" : ""),
            hasItinerary,
            toolCalls: finalToolCalls,
          });
          // Keep tool call indicators visible for 2.5s so user sees the green checkmark
          if (finalToolCalls.length > 0) {
            setTimeout(() => setActiveToolCalls([]), 2500);
          } else {
            setActiveToolCalls([]);
          }
        },
        onError: (error) => {
          setIsTyping(false);
          toast.error(error);
          upsertAssistant(`⚠️ ${error}`);
          setActiveToolCalls([]);
        },
      });
    } catch {
      setIsTyping(false);
      toast.error("Failed to connect to AI service");
      upsertAssistant("⚠️ Failed to connect to AI service. Please try again.");
      setActiveToolCalls([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sidebarSessions: ChatSession[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    preview: s.messages[s.messages.length - 1]?.content.slice(0, 60) || "New conversation",
    timestamp: s.createdAt,
    hasItinerary: s.hasItinerary,
    tripDestination: s.tripDestination,
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 pt-16 flex overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <ChatSidebar
            sessions={sidebarSessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
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
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your AI Travel Planner</h1>
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
                    <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 195+ countries</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Real AI planning</span>
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Powered by AI</span>
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
                        {/* Only show text bubble if there's content */}
                        {message.content.trim() && (
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
                        )}

                        {/* Tool call status for saved messages */}
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <ToolCallIndicator toolCalls={message.toolCalls} />
                        )}

                        {message.hasItinerary && (
                          <motion.button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full justify-center"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <MapIcon className="w-4 h-4" />
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

                {/* Live tool call status */}
                <AnimatePresence>
                  {activeToolCalls.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 flex-shrink-0" />
                      <ToolCallIndicator toolCalls={activeToolCalls} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isTyping && activeToolCalls.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
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

          {/* Right panel: Agent Activity */}
          <AnimatePresence>
            {(agentRunning || agentTripId) && (
              <motion.div
                className="hidden lg:block w-72 border-l border-border overflow-y-auto scrollbar-hide p-3"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 288, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AgentActivityPanel tripId={agentTripId} isRunning={agentRunning} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ToolCallIndicator({ toolCalls }: { toolCalls: ToolCallStatus[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl px-4 py-3 space-y-2"
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tool Activity</p>
      {toolCalls.map((tc, i) => (
        <motion.div
          key={`${tc.name}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2.5"
        >
          {tc.status === "running" || tc.status === "pending" ? (
            <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin flex-shrink-0" />
          ) : tc.status === "done" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
            >
              <Check className="w-3 h-3 text-emerald-400" />
            </motion.div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <Circle className="w-3 h-3 text-destructive" />
            </div>
          )}
          <span className={`text-xs font-medium ${
            tc.status === "done" ? "text-emerald-400" : 
            tc.status === "error" ? "text-destructive" : "text-foreground"
          }`}>
            {TOOL_DISPLAY_NAMES[tc.name] || tc.name}
          </span>
          <span className={`text-[10px] ml-auto ${
            tc.status === "done" ? "text-emerald-400/70" : 
            tc.status === "error" ? "text-destructive/70" : "text-muted-foreground"
          }`}>
            {tc.status === "running" ? "In progress…" : tc.status === "done" ? "Complete" : tc.status === "pending" ? "Waiting…" : "Failed"}
          </span>
        </motion.div>
      ))}
    </motion.div>
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
