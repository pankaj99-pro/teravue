import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, Compass, MessageSquare, Map, BookOpen, Users, History } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const navLinks = [
  { label: "AI Chat", icon: MessageSquare, path: "/chat" },
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Itinerary", icon: Map, path: "/" },
  { label: "Blog", icon: BookOpen, path: "/blog" },
  { label: "Community", icon: Users, path: "/community" },
];

const notifications = [
  { id: 1, type: "trip", title: "Trip Reminder", message: "Your Rome trip starts in 3 days!", time: "2m ago", read: false },
  { id: 2, type: "social", title: "New Follower", message: "Aiko Yamamoto started following you", time: "1h ago", read: false },
  { id: 3, type: "deal", title: "Price Drop Alert", message: "Flights to Tokyo dropped 23% — $680 roundtrip", time: "3h ago", read: false },
  { id: 4, type: "comment", title: "New Comment", message: "Maya Chen replied to your Lisbon post", time: "5h ago", read: true },
  { id: 5, type: "trip", title: "Booking Confirmed", message: "Hotel Lancelot — Oct 12-16 confirmed ✅", time: "1d ago", read: true },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set([4, 5]));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (id: number, title: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    toast.success(`Opening: ${title}`);
  };

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
    toast.success("All notifications marked as read");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6">
      <div className="flex items-center gap-2 mr-8 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-wider text-foreground font-display">TERAVUE.</span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              isActive(link.path)
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Notification bell + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-primary-foreground"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-xl border border-border shadow-2xl overflow-hidden z-[100]"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.title)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 ${
                        !readIds.has(notif.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!readIds.has(notif.id) ? "bg-primary" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{notif.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <button onClick={() => { setShowNotifications(false); toast.info("All notifications — coming soon!"); }} className="w-full text-center text-xs text-primary hover:underline">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-semibold text-primary-foreground">
            CS
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-medium text-foreground leading-none">Profile</p>
            <p className="text-xs text-muted-foreground">View your profile</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </nav>
  );
}
