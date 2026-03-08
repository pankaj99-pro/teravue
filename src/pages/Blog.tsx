import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Heart, MessageCircle, Bookmark, ArrowRight, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

const categories = ["All", "Guides", "Tips", "Stories", "Food", "Culture"];

const articles = [
  {
    id: 1, category: "Guides",
    title: "The Ultimate 2026 Guide to Backpacking Southeast Asia",
    excerpt: "Everything you need to know about traveling through Thailand, Vietnam, Cambodia, and Laos on a budget.",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop",
    author: "Maya Chen", authorAvatar: "MC", readTime: "12 min", likes: 342, comments: 56,
    date: "Mar 5, 2026", featured: true,
  },
  {
    id: 2, category: "Tips",
    title: "10 Airport Hacks That Will Save You Time and Money",
    excerpt: "From lounge access tricks to the best apps for finding cheap last-minute upgrades.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=600&h=400&fit=crop",
    author: "Jake Torres", authorAvatar: "JT", readTime: "6 min", likes: 218, comments: 34,
    date: "Mar 3, 2026", featured: false,
  },
  {
    id: 3, category: "Food",
    title: "Street Food Tour: The Best Bites in Mexico City",
    excerpt: "From tacos al pastor to churros — a local's guide to eating your way through CDMX.",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop",
    author: "Sofia Reyes", authorAvatar: "SR", readTime: "8 min", likes: 189, comments: 27,
    date: "Feb 28, 2026", featured: false,
  },
  {
    id: 4, category: "Stories",
    title: "How I Quit My Job and Traveled the World for a Year",
    excerpt: "The fears, the freedom, and the lessons learned from 365 days of full-time travel.",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop",
    author: "Alex Kim", authorAvatar: "AK", readTime: "15 min", likes: 567, comments: 89,
    date: "Feb 25, 2026", featured: false,
  },
  {
    id: 5, category: "Culture",
    title: "Understanding Japanese Onsen Etiquette",
    excerpt: "A respectful guide to enjoying Japan's traditional hot spring baths like a local.",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop",
    author: "Yuki Tanaka", authorAvatar: "YT", readTime: "7 min", likes: 145, comments: 19,
    date: "Feb 22, 2026", featured: false,
  },
  {
    id: 6, category: "Guides",
    title: "Solo Female Travel: Top 15 Safest Destinations",
    excerpt: "Empowering destinations that offer incredible experiences with safety and comfort.",
    image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&h=400&fit=crop",
    author: "Emma Liu", authorAvatar: "EL", readTime: "10 min", likes: 423, comments: 72,
    date: "Feb 18, 2026", featured: false,
  },
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());

  const featured = articles.find((a) => a.featured);
  const filtered = articles.filter((a) => {
    if (activeCategory === "All") return !a.featured;
    return a.category === activeCategory && !a.featured;
  });

  const toggleBookmark = (id: number) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info("Removed from saved"); }
      else { next.add(id); toast.success("Article saved 🔖"); }
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Travel Blog</h1>
              <p className="text-muted-foreground mt-1">Stories, tips, and guides from travelers worldwide</p>
            </div>
            <button onClick={() => toast.info("Write a post — coming soon!")} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Write a Post <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Featured article */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-panel rounded-2xl overflow-hidden cursor-pointer card-hover group"
              onClick={() => toast.success(`Opening "${featured.title}"…`)}
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 h-48 md:h-auto overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">{featured.category}</span>
                    <span className="flex items-center gap-1 text-xs text-secondary"><TrendingUp className="w-3 h-3" /> Trending</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{featured.title}</h2>
                  <p className="text-sm text-muted-foreground">{featured.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-primary-foreground">{featured.authorAvatar}</div>
                    <span className="text-foreground font-medium">{featured.author}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featured.readTime}</span>
                    <span>·</span>
                    <span>{featured.date}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat ? "bg-primary/15 text-primary border border-primary/30" : "glass-panel text-muted-foreground hover:text-foreground"
                }`}
              >{cat}</button>
            ))}
          </div>

          {/* Articles grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
            {filtered.map((article, i) => (
              <motion.div
                key={article.id}
                className="glass-panel rounded-2xl overflow-hidden card-hover group cursor-pointer"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={() => toast.success(`Opening "${article.title}"…`)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm text-white">{article.category}</span>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[8px] font-bold text-primary-foreground">{article.authorAvatar}</div>
                      <span>{article.author}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {article.readTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <button onClick={(e) => { e.stopPropagation(); toast.success("Liked!"); }} className="flex items-center gap-0.5 hover:text-red-400 transition-colors">
                        <Heart className="w-3 h-3" /> {article.likes}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id); }} className="hover:text-primary transition-colors">
                        <Bookmark className={`w-3 h-3 ${bookmarked.has(article.id) ? "fill-primary text-primary" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
