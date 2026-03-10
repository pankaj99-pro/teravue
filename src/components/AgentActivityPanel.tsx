import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Hotel, UtensilsCrossed, MapPin, DollarSign, Car, Brain, CheckCircle2, Loader2, Clock, ChevronDown, ChevronUp, Train } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AgentStatus {
  agent_type: string;
  emoji: string;
  label: string;
  status: "idle" | "pending" | "running" | "completed";
  result_summary: string | null;
}

interface AgentLog {
  step_type: string;
  message: string;
  created_at: string;
}

interface AgentActivityPanelProps {
  tripId: string | null;
  isRunning: boolean;
}

const agentIcons: Record<string, typeof Plane> = {
  flight_agent: Plane,
  hotel_agent: Hotel,
  restaurant_agent: UtensilsCrossed,
  attraction_agent: MapPin,
  budget_agent: DollarSign,
  transport_agent: Car,
};

const statusColors: Record<string, string> = {
  idle: "text-muted-foreground",
  pending: "text-muted-foreground",
  running: "text-primary",
  completed: "text-green-400",
};

const statusBgColors: Record<string, string> = {
  idle: "bg-muted/30",
  pending: "bg-muted/30",
  running: "bg-primary/10 border-primary/30",
  completed: "bg-green-500/10 border-green-500/30",
};

export function AgentActivityPanel({ tripId, isRunning }: AgentActivityPanelProps) {
  const [agents, setAgents] = useState<AgentStatus[]>([
    { agent_type: "flight_agent", emoji: "✈️", label: "Flight Agent", status: "idle", result_summary: null },
    { agent_type: "hotel_agent", emoji: "🏨", label: "Hotel Agent", status: "idle", result_summary: null },
    { agent_type: "restaurant_agent", emoji: "🍝", label: "Restaurant Agent", status: "idle", result_summary: null },
    { agent_type: "attraction_agent", emoji: "📍", label: "Attraction Agent", status: "idle", result_summary: null },
    { agent_type: "budget_agent", emoji: "💰", label: "Budget Agent", status: "idle", result_summary: null },
    { agent_type: "transport_agent", emoji: "🚗", label: "Transport Agent", status: "idle", result_summary: null },
  ]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [supervisorStatus, setSupervisorStatus] = useState<string>("idle");

  // Subscribe to realtime agent_tasks changes
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`agent-tasks-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_tasks", filter: `trip_id=eq.${tripId}` },
        (payload: any) => {
          const task = payload.new;
          if (task) {
            setAgents((prev) =>
              prev.map((a) =>
                a.agent_type === task.agent_type
                  ? { ...a, status: task.status, result_summary: task.result_summary }
                  : a
              )
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  // Subscribe to realtime agent_logs
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`agent-logs-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_logs", filter: `trip_id=eq.${tripId}` },
        (payload: any) => {
          const log = payload.new;
          if (log) {
            setLogs((prev) => [...prev, { step_type: log.step_type, message: log.message, created_at: log.created_at }]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  // Update supervisor status based on agent states
  useEffect(() => {
    if (isRunning) {
      const allCompleted = agents.every((a) => a.status === "completed");
      const anyRunning = agents.some((a) => a.status === "running");
      if (allCompleted) setSupervisorStatus("completed");
      else if (anyRunning) setSupervisorStatus("running");
      else setSupervisorStatus("planning");
    }
  }, [agents, isRunning]);

  const completedCount = agents.filter((a) => a.status === "completed").length;

  return (
    <motion.div
      className="glass-panel rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Agent Team</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {completedCount}/{agents.length} complete
          </span>
          {isRunning && (
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Agent list */}
      <div className="p-3 space-y-2">
        {agents.map((agent, i) => {
          const Icon = agentIcons[agent.agent_type] || MapPin;
          return (
            <motion.div
              key={agent.agent_type}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors ${statusBgColors[agent.status]}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                agent.status === "running" ? "bg-primary/20" : agent.status === "completed" ? "bg-green-500/20" : "bg-muted/50"
              }`}>
                {agent.status === "running" ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : agent.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{agent.emoji} {agent.label}</span>
                </div>
                <p className={`text-[10px] ${statusColors[agent.status]} truncate`}>
                  {agent.status === "running"
                    ? "Working..."
                    : agent.status === "completed"
                    ? agent.result_summary || "Done"
                    : agent.status === "pending"
                    ? "Waiting..."
                    : "Idle"}
                </p>
              </div>

              {agent.status === "running" && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Logs toggle */}
      {logs.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Activity Log ({logs.length})
            </span>
            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {showLogs && (
              <motion.div
                className="px-4 pb-3 max-h-40 overflow-y-auto scrollbar-hide space-y-1"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2 py-1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      log.step_type === "thinking" ? "bg-primary" :
                      log.step_type === "tool_call" ? "bg-amber-400" :
                      log.step_type === "tool_result" ? "bg-green-400" :
                      "bg-muted-foreground"
                    }`} />
                    <p className="text-[10px] text-muted-foreground leading-snug">{log.message}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
