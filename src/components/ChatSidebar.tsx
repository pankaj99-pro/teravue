import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, MapPin, Calendar, Trash2, ChevronLeft, ChevronRight, Plane, Clock } from "lucide-react";
import { useItinerary, TripPlan } from "@/contexts/ItineraryContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  hasItinerary: boolean;
  tripDestination?: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const { tripPlan } = useItinerary();
  const navigate = useNavigate();

  return (
    <motion.div
      className="h-full border-r border-border bg-card/30 flex flex-col relative"
      animate={{ width: collapsed ? 52 : 280 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-4 z-10 w-6 h-6 rounded-full glass-panel border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* New chat button */}
      <div className="p-3 flex-shrink-0">
        <motion.button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </motion.button>
      </div>

      {/* Chat history */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-2 font-semibold">
            Recent Chats
          </p>
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative ${
                  activeSessionId === session.id
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                }`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                layout
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-xs">{session.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{session.preview}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground/60">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {session.timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      {session.hasItinerary && (
                        <span className="flex items-center gap-0.5 text-secondary">
                          <MapPin className="w-2.5 h-2.5" /> Itinerary
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.button>
            ))}
          </AnimatePresence>

          {sessions.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No chats yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Start a conversation to plan your trip</p>
            </div>
          )}
        </div>
      )}

      {/* Itinerary preview card */}
      {!collapsed && tripPlan && (
        <div className="flex-shrink-0 p-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-2 font-semibold">
            Active Itinerary
          </p>
          <motion.button
            onClick={() => navigate("/")}
            className="w-full glass-panel rounded-xl p-3 text-left card-hover space-y-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Plane className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {tripPlan.destination}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {tripPlan.countryFlag} {tripPlan.country}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {tripPlan.dateRange}
              </span>
              <span>{tripPlan.totalDays} days</span>
              <span>{tripPlan.days.reduce((sum, d) => sum + d.stops.length, 0)} stops</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {tripPlan.days.slice(0, 3).map((day) => (
                <span key={day.day} className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                  D{day.day}: {day.title.length > 12 ? day.title.slice(0, 12) + "…" : day.title}
                </span>
              ))}
              {tripPlan.days.length > 3 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-accent text-muted-foreground">
                  +{tripPlan.days.length - 3} more
                </span>
              )}
            </div>
            <p className="text-[10px] text-primary font-medium">View on Map →</p>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
