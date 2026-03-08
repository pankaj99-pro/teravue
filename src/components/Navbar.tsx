import { Bell, ChevronDown, Compass, MessageSquare, Map, BookOpen, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

const navLinks = [
  { label: "AI Chat", icon: MessageSquare, path: "/chat" },
  { label: "Explore", icon: Compass, path: "" },
  { label: "Itinerary", icon: Map, path: "/" },
  { label: "Blog", icon: BookOpen, path: "" },
  { label: "Community", icon: Users, path: "" },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (label: string, path: string) => {
    if (path) {
      navigate(path);
    } else {
      toast.info(`${label} — coming soon!`);
    }
  };

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  return (
    <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6">
      <div className="flex items-center gap-2 mr-8 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-wider text-foreground">TERAVUE.</span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <button
            key={link.label}
            onClick={() => handleNavClick(link.label, link.path)}
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
        <button
          onClick={() => toast.info("No new notifications")}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <button
          onClick={() => toast.info("Profile settings — coming soon!")}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-semibold text-primary-foreground">
            CS
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-medium text-foreground leading-none">Claribel Sefira</p>
            <p className="text-xs text-muted-foreground">@firaclari</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </nav>
  );
}
