import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Heart, MessageCircle, Bookmark, ArrowRight, TrendingUp, Share2, ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const categories = ["All", "Guides", "Tips", "Stories", "Food", "Culture"];

const articles = [
  {
    id: 1, category: "Guides",
    title: "The Ultimate 2026 Guide to Backpacking Southeast Asia",
    excerpt: "Everything you need to know about traveling through Thailand, Vietnam, Cambodia, and Laos on a budget.",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&h=600&fit=crop",
    author: "Maya Chen", authorAvatar: "MC", readTime: "12 min", likes: 342, comments: 56,
    date: "Mar 5, 2026", featured: true,
    body: [
      "Southeast Asia remains one of the most rewarding regions for budget travelers in 2026. With incredible food, rich culture, and stunning natural beauty, it's no wonder backpackers flock here year after year.",
      "Start in Bangkok — the city's street food scene is legendary. From pad thai on Khao San Road to hidden gems in Chinatown, you'll eat like royalty for under $5 a meal. Then head north to Chiang Mai for temple-hopping and jungle trekking.",
      "Vietnam offers an incredible north-to-south route: Hanoi's Old Quarter, Ha Long Bay's limestone karsts, the ancient town of Hoi An, and the buzzing energy of Ho Chi Minh City. Budget about $25–35/day for a comfortable backpacker experience.",
      "Don't skip Cambodia — Angkor Wat at sunrise is a bucket-list moment. And Laos, often overlooked, rewards slow travelers with Luang Prabang's monks' morning alms, Mekong River cruises, and untouched caves.",
      "Pro tip: Get a local SIM card at each border crossing, use Grab for transport, and book hostels on Hostelworld for the best social experience.",
    ],
    relatedTags: ["Budget Travel", "Backpacking", "Southeast Asia", "Thailand", "Vietnam"],
  },
  {
    id: 2, category: "Tips",
    title: "10 Airport Hacks That Will Save You Time and Money",
    excerpt: "From lounge access tricks to the best apps for finding cheap last-minute upgrades.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&h=600&fit=crop",
    author: "Jake Torres", authorAvatar: "JT", readTime: "6 min", likes: 218, comments: 34,
    date: "Mar 3, 2026", featured: false,
    body: [
      "Airports don't have to be stressful or expensive. With the right strategies, you can breeze through security, find hidden lounges, and even score upgrades.",
      "Hack #1: Use LoungeBuddy or Priority Pass to access airport lounges for a fraction of the cost. Many credit cards include complimentary access — check yours before buying a day pass.",
      "Hack #2: Always check in online 24 hours before your flight. This gives you the best seat selection and sometimes reveals cheaper upgrade options.",
      "Hack #3: Pack a refillable water bottle and fill it after security. Airport water can cost $5+, and staying hydrated makes flights much more comfortable.",
      "Hack #4: Download offline maps and entertainment before you leave. Airport WiFi can be slow, and cellular data roaming is expensive.",
    ],
    relatedTags: ["Airport", "Travel Hacks", "Budget", "Flying Tips"],
  },
  {
    id: 3, category: "Food",
    title: "Street Food Tour: The Best Bites in Mexico City",
    excerpt: "From tacos al pastor to churros — a local's guide to eating your way through CDMX.",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&h=600&fit=crop",
    author: "Sofia Reyes", authorAvatar: "SR", readTime: "8 min", likes: 189, comments: 27,
    date: "Feb 28, 2026", featured: false,
    body: [
      "Mexico City's street food scene is unmatched. Every corner has a taco stand, every market hides a culinary gem, and the flavors are bold, fresh, and unforgettable.",
      "Start your morning at a local mercado with fresh-squeezed orange juice and tamales. Head to the Roma neighborhood for artisan coffee and chilaquiles at a trendy café.",
      "For lunch, nothing beats tacos al pastor from a proper trompo — look for the ones with a pineapple on top spinning over charcoal. El Huequito and El Vilsito are legendary spots.",
      "Don't miss elote (grilled corn with mayo, chili, and lime) from street vendors, or tlayudas if you venture to the Oaxacan food stalls in Mercado de la Merced.",
      "End your night with churros and hot chocolate from El Moro — they've been perfecting the recipe since 1935.",
    ],
    relatedTags: ["Street Food", "Mexico City", "Tacos", "Food Travel", "CDMX"],
  },
  {
    id: 4, category: "Stories",
    title: "How I Quit My Job and Traveled the World for a Year",
    excerpt: "The fears, the freedom, and the lessons learned from 365 days of full-time travel.",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=600&fit=crop",
    author: "Alex Kim", authorAvatar: "AK", readTime: "15 min", likes: 567, comments: 89,
    date: "Feb 25, 2026", featured: false,
    body: [
      "It started with a 'what if.' What if I just… left? Packed a bag, bought a one-way ticket, and figured it out as I went? So I did. I quit my corporate job, sold most of my stuff, and booked a flight to Lisbon.",
      "The first month was terrifying. I questioned everything. Was this a mistake? Would I run out of money? Would I be lonely? But slowly, the rhythm of travel took over.",
      "I spent three months in Europe, two in Southeast Asia, three in South America, and the rest scattered across Africa and the Middle East. I stayed in hostels, worked on farms, taught English, and house-sat for strangers.",
      "The biggest lesson? You don't need nearly as much as you think — in possessions, in plans, or in certainty. The world is far kinder and more welcoming than the news suggests.",
      "Would I do it again? In a heartbeat. But now I travel differently — slower, more intentionally, and with a deeper appreciation for both the road and the return.",
    ],
    relatedTags: ["Personal Story", "Long-term Travel", "Career Break", "Solo Travel"],
  },
  {
    id: 5, category: "Culture",
    title: "Understanding Japanese Onsen Etiquette",
    excerpt: "A respectful guide to enjoying Japan's traditional hot spring baths like a local.",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&h=600&fit=crop",
    author: "Yuki Tanaka", authorAvatar: "YT", readTime: "7 min", likes: 145, comments: 19,
    date: "Feb 22, 2026", featured: false,
    body: [
      "Visiting an onsen (hot spring bath) is one of Japan's most cherished traditions. For travelers, it can also be one of the most intimidating — but it doesn't have to be.",
      "Rule #1: Wash thoroughly before entering the bath. Every onsen has a washing station with stools, buckets, soap, and shampoo. Sit down, scrub clean, and rinse completely.",
      "Rule #2: No swimsuits. Onsens are experienced nude, with genders separated. You'll be given a small towel — carry it on your head or set it beside the bath, never in the water.",
      "Rule #3: Enter slowly and quietly. Onsens are places of relaxation and reflection. Avoid splashing, loud conversations, or submerging your head.",
      "Once you relax into it, the experience is deeply restorative. The mineral-rich waters soothe muscles, the steam clears the mind, and the ritual connects you to centuries of Japanese culture.",
    ],
    relatedTags: ["Japan", "Culture", "Onsen", "Etiquette", "Hot Springs"],
  },
  {
    id: 6, category: "Guides",
    title: "Solo Female Travel: Top 15 Safest Destinations",
    excerpt: "Empowering destinations that offer incredible experiences with safety and comfort.",
    image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1200&h=600&fit=crop",
    author: "Emma Liu", authorAvatar: "EL", readTime: "10 min", likes: 423, comments: 72,
    date: "Feb 18, 2026", featured: false,
    body: [
      "Solo female travel is more popular and accessible than ever. With the right destinations and preparation, it's an incredibly empowering and transformative experience.",
      "Top picks include Iceland (safest country in the world), New Zealand (friendly locals, stunning landscapes), Japan (ultra-safe, efficient transport), and Portugal (affordable, welcoming, great food).",
      "In Southeast Asia, Vietnam and Thailand stand out for their well-established backpacker infrastructure and welcoming communities. In South America, Colombia has seen a remarkable safety transformation.",
      "Key tips: Share your itinerary with someone at home, trust your instincts, learn a few local phrases, and connect with other solo travelers through apps like Tourlina or Bumble BFF.",
      "Remember: solo doesn't mean lonely. Some of the deepest connections happen when you travel alone — with locals, with fellow travelers, and with yourself.",
    ],
    relatedTags: ["Solo Travel", "Female Travel", "Safety", "Empowerment"],
  },
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<typeof articles[0] | null>(null);

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
              onClick={() => setSelectedArticle(featured)}
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
                onClick={() => setSelectedArticle(article)}
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
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {article.likes}</span>
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

      {/* Article Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/50 bg-background gap-0 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogTitle className="sr-only">{selectedArticle?.title ?? "Article details"}</DialogTitle>
          {selectedArticle && (
            <>
              {/* Hero image */}
              <div className="relative h-52 md:h-64 overflow-hidden">
                <img src={selectedArticle.heroImage} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">{selectedArticle.category}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {selectedArticle.readTime}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{selectedArticle.title}</h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 md:p-6 space-y-5">
                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground">{selectedArticle.authorAvatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedArticle.author}</p>
                      <p className="text-xs text-muted-foreground">{selectedArticle.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleBookmark(selectedArticle.id)} className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform">
                      <Bookmark className={`w-4 h-4 ${bookmarked.has(selectedArticle.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                    <button onClick={() => toast.success("Link copied!")} className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform">
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Article body */}
                <div className="space-y-4">
                  {selectedArticle.body.map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
                  ))}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.relatedTags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/60 text-foreground border border-border/50">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <button onClick={() => toast.success("Liked!")} className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                      <Heart className="w-4 h-4" /> {selectedArticle.likes} likes
                    </button>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" /> {selectedArticle.comments} comments
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedArticle.readTime} read</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
