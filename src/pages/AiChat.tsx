import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestionChips = [
  { label: "Plan a trip to Tokyo", icon: Plane },
  { label: "Best restaurants in Paris", icon: UtensilsCrossed },
  { label: "Hotels near Colosseum", icon: Hotel },
  { label: "Hidden gems in Bali", icon: Compass },
];

const sampleResponses: Record<string, string> = {
  default: `Great question! I'd love to help you plan your next adventure. Here are some things I can assist with:

- 🗺️ **Destination recommendations** based on your preferences
- ✈️ **Flight & hotel suggestions** with estimated pricing
- 🍽️ **Restaurant picks** curated by locals
- 📅 **Day-by-day itineraries** tailored to your travel style

What kind of trip are you dreaming about?`,
  tokyo: `## 🇯🇵 Tokyo — A Perfect 5-Day Itinerary

Tokyo is an incredible blend of ultra-modern and traditional. Here's what I'd suggest:

**Day 1 — Shibuya & Harajuku**
- Walk the famous Shibuya Crossing
- Explore Takeshita Street for quirky fashion
- Dinner at a local ramen shop (~$12)

**Day 2 — Asakusa & Akihabara**
- Visit Senso-ji Temple (free)
- Browse electronics & anime shops
- Try street food at Nakamise-dori

**Day 3 — Shinjuku & Golden Gai**
- Shinjuku Gyoen National Garden ($2.50)
- Explore the tiny bars of Golden Gai
- Robot Restaurant show ($55)

**Estimated budget:** $1,800–2,400 for 5 days (flights not included)

Want me to create a full itinerary with bookings?`,
  paris: `## 🇫🇷 Best Restaurants in Paris

Here are my top picks across different price ranges:

### 💎 Fine Dining
- **Le Comptoir du Panthéon** — Classic French bistro, ~$45/person
- **Septime** — Modern French, Michelin-starred, ~$95/person

### 🍷 Mid-Range
- **Breizh Café** — Best crêpes in Le Marais, ~$18/person
- **Chez Janou** — Famous chocolate mousse, ~$30/person

### 🥖 Budget-Friendly
- **L'As du Fallafel** — Legendary falafel in the Marais, ~$8
- **Pink Mamma** — Italian-French fusion, ~$15/person

Shall I add any of these to your Rome itinerary, or plan a separate Paris trip?`,
  hotel: `## 🏨 Hotels Near the Colosseum

I found some great options within walking distance:

| Hotel | Distance | Price/Night | Rating |
|-------|----------|-------------|--------|
| Hotel Palazzo Manfredi | 50m | $320 | ⭐⭐⭐⭐⭐ |
| Mercure Roma Centro | 200m | $145 | ⭐⭐⭐⭐ |
| Hotel Lancelot | 300m | $110 | ⭐⭐⭐⭐ |
| The Inn at the Roman Forum | 400m | $195 | ⭐⭐⭐⭐⭐ |

💡 **My recommendation:** Hotel Lancelot offers the best value — great reviews, family-run, and only a 4-minute walk to the Colosseum.

Want me to check availability for your October dates?`,
  bali: `## 🌴 Hidden Gems in Bali

Skip the tourist traps! Here are spots most visitors miss:

### 🏖️ Secret Beaches
- **Nyang Nyang Beach** — A hidden paradise with almost no crowds
- **Green Bowl Beach** — Stunning cliffs, requires 300 steps down

### 🌿 Nature & Culture
- **Sidemen Valley** — Rice terraces without the Tegallalang crowds
- **Tukad Cepung Waterfall** — A magical cave waterfall
- **Penglipuran Village** — One of the cleanest villages in the world

### 🍜 Local Food Spots
- **Warung Babi Guling Ibu Oka** — Legendary roast pork ($3)
- **Nasi Ayam Kedewatan** — Best chicken rice in Ubud ($2)

**Pro tip:** Rent a scooter ($5/day) to explore these off-the-beaten-path locations.

Want me to build a Bali itinerary around these gems?`,
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("tokyo") || lower.includes("japan")) return sampleResponses.tokyo;
  if (lower.includes("paris") || lower.includes("restaurant") || lower.includes("food")) return sampleResponses.paris;
  if (lower.includes("hotel") || lower.includes("colosseum") || lower.includes("stay")) return sampleResponses.hotel;
  if (lower.includes("bali") || lower.includes("hidden") || lower.includes("gem")) return sampleResponses.bali;
  return sampleResponses.default;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: getResponse(messageText),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);
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
              {/* Welcome state */}
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
                    Your AI Travel Companion
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base">
                    Ask me anything about destinations, itineraries, flights, hotels, or local experiences.
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
                      <p className="text-xs text-muted-foreground mt-0.5">Tap to explore →</p>
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> 195+ countries
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Real-time data
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI-powered
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

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "glass-panel rounded-bl-md"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_strong]:text-foreground">
                          {message.content.split("\n").map((line, i) => {
                            if (line.startsWith("## ")) return <h2 key={i}>{line.replace("## ", "")}</h2>;
                            if (line.startsWith("### ")) return <h3 key={i}>{line.replace("### ", "")}</h3>;
                            if (line.startsWith("- ")) return <p key={i} className="pl-2">{renderBold(line)}</p>;
                            if (line.startsWith("| ")) return <p key={i} className="font-mono text-xs text-muted-foreground">{line}</p>;
                            if (line.trim() === "") return <div key={i} className="h-1" />;
                            return <p key={i}>{renderBold(line)}</p>;
                          })}
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      <p className={`text-[10px] mt-2 ${
                        message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
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
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any destination, itinerary, or travel tips…"
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
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              AI-generated travel suggestions. Always verify bookings and travel advisories.
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
