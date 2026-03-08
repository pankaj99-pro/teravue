import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Heart, Filter, TrendingUp, Globe, Calendar, Users, DollarSign, ArrowRight, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const categories = ["All", "Beaches", "Mountains", "Cities", "Historical", "Adventure", "Romantic"];

const destinations = [
  {
    id: 1, name: "Santorini, Greece", category: "Beaches",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1200&h=600&fit=crop",
    rating: 4.9, reviews: 2847, price: "$1,200", description: "Iconic white-washed buildings with stunning sunsets over the Aegean Sea.",
    tags: ["Island", "Romantic", "Photography"],
    fullDescription: "Santorini is a volcanic island in the Cyclades group of the Greek islands. It's famous for dramatic views, stunning sunsets from Oia, the gorgeous blue-domed churches, and its very own active volcano. The island offers incredible beaches with red, black, and white volcanic sand.",
    bestTime: "April – October",
    avgDuration: "5–7 days",
    idealFor: "Couples, Photographers",
    highlights: ["Oia Sunset", "Red Beach", "Akrotiri Ruins", "Wine Tasting", "Caldera Cruise"],
  },
  {
    id: 2, name: "Kyoto, Japan", category: "Historical",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=600&fit=crop",
    rating: 4.8, reviews: 3156, price: "$950", description: "Ancient temples, bamboo forests, and traditional tea ceremonies.",
    tags: ["Culture", "Temples", "Nature"],
    fullDescription: "Kyoto served as Japan's capital for over a millennium and is home to 17 UNESCO World Heritage sites. The city seamlessly blends ancient traditions with modern life, offering visitors a window into authentic Japanese culture through its temples, gardens, geisha districts, and exquisite cuisine.",
    bestTime: "March – May, October – November",
    avgDuration: "4–6 days",
    idealFor: "Culture Enthusiasts, Solo Travelers",
    highlights: ["Fushimi Inari Shrine", "Arashiyama Bamboo Grove", "Kinkaku-ji", "Gion District", "Tea Ceremony"],
  },
  {
    id: 3, name: "Swiss Alps", category: "Mountains",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&h=600&fit=crop",
    rating: 4.9, reviews: 1923, price: "$2,100", description: "Majestic peaks, pristine lakes, and world-class skiing.",
    tags: ["Skiing", "Hiking", "Scenic"],
    fullDescription: "The Swiss Alps offer an unparalleled mountain experience with dramatic peaks, crystal-clear lakes, and charming alpine villages. Whether you're seeking adventure on the slopes, serene hiking trails, or simply breathtaking panoramic views, the Swiss Alps deliver year-round.",
    bestTime: "Dec – Mar (ski), Jun – Sep (hike)",
    avgDuration: "7–10 days",
    idealFor: "Adventure Seekers, Families",
    highlights: ["Matterhorn", "Jungfraujoch", "Lake Geneva", "Zermatt Village", "Glacier Express"],
  },
  {
    id: 4, name: "Marrakech, Morocco", category: "Cities",
    image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&h=600&fit=crop",
    rating: 4.6, reviews: 2104, price: "$680", description: "Vibrant souks, stunning riads, and rich cultural heritage.",
    tags: ["Markets", "Culture", "Food"],
    fullDescription: "Marrakech is a sensory feast — the maze-like medina, bustling Jemaa el-Fnaa square, fragrant spice markets, and ornate palaces create an unforgettable tapestry. Stay in a traditional riad, haggle in the souks, and savor tagine under the stars.",
    bestTime: "March – May, September – November",
    avgDuration: "3–5 days",
    idealFor: "Culture Lovers, Foodies",
    highlights: ["Jemaa el-Fnaa", "Majorelle Garden", "Bahia Palace", "Souk Shopping", "Hammam Experience"],
  },
  {
    id: 5, name: "Patagonia, Argentina", category: "Adventure",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=600&fit=crop",
    rating: 4.8, reviews: 987, price: "$1,800", description: "Dramatic glaciers, wild landscapes, and epic trekking routes.",
    tags: ["Trekking", "Wildlife", "Glaciers"],
    fullDescription: "Patagonia is the ultimate frontier for adventurers. Spanning the southern tip of South America, this vast wilderness features towering granite spires, ancient glaciers, pristine lakes, and diverse wildlife. It's one of the last truly wild places on Earth.",
    bestTime: "November – March",
    avgDuration: "10–14 days",
    idealFor: "Hikers, Nature Lovers",
    highlights: ["Perito Moreno Glacier", "Torres del Paine", "Mount Fitz Roy", "Tierra del Fuego", "Whale Watching"],
  },
  {
    id: 6, name: "Amalfi Coast, Italy", category: "Romantic",
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=400&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=1200&h=600&fit=crop",
    rating: 4.7, reviews: 2563, price: "$1,400", description: "Cliffside villages, turquoise waters, and incredible Italian cuisine.",
    tags: ["Coastal", "Food", "Romantic"],
    fullDescription: "The Amalfi Coast is a 50-kilometer stretch of coastline along the southern edge of Italy's Sorrentine Peninsula. Its dramatic cliffs, pastel-colored fishing villages, terraced vineyards, and sparkling Mediterranean waters make it one of Europe's most romantic destinations.",
    bestTime: "May – September",
    avgDuration: "5–7 days",
    idealFor: "Couples, Food Lovers",
    highlights: ["Positano Village", "Path of the Gods", "Ravello Gardens", "Limoncello Tasting", "Boat Tour to Capri"],
  },
];

const trending = [
  { name: "Bali, Indonesia", searches: "+42%" },
  { name: "Iceland", searches: "+38%" },
  { name: "Costa Rica", searches: "+27%" },
];

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [selectedDest, setSelectedDest] = useState<typeof destinations[0] | null>(null);

  const filtered = destinations.filter((d) => {
    const matchesCategory = activeCategory === "All" || d.category === activeCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info("Removed from wishlist"); }
      else { next.add(id); toast.success("Added to wishlist ❤️"); }
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Explore Destinations</h1>
            <p className="text-muted-foreground">Discover your next unforgettable journey</p>
          </motion.div>

          {/* Search + Trending */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 glass-panel rounded-xl flex items-center gap-3 px-4 py-3">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations, activities, or experiences…"
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
              />
              <button onClick={() => toast.info("Filters — coming soon!")} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
            <div className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-secondary flex-shrink-0" />
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {trending.map((t) => (
                  <button key={t.name} onClick={() => setSearchQuery(t.name.split(",")[0])} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent/50 text-foreground hover:bg-accent transition-colors whitespace-nowrap">
                    {t.name} <span className="text-secondary">{t.searches}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "glass-panel text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Destinations grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
            {filtered.map((dest, i) => (
              <motion.div
                key={dest.id}
                className="glass-panel rounded-2xl overflow-hidden card-hover group cursor-pointer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedDest(dest)}
              >
                <div className="relative h-44 overflow-hidden">
                  <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(dest.id); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Heart className={`w-4 h-4 ${liked.has(dest.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                  </button>
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    {dest.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm text-white">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {dest.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dest.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-foreground font-medium">{dest.rating}</span>
                      <span className="text-muted-foreground">({dest.reviews.toLocaleString()})</span>
                    </div>
                    <p className="text-sm font-bold text-secondary">{dest.price}<span className="text-xs text-muted-foreground font-normal"> avg</span></p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Destination Detail Dialog */}
      <Dialog open={!!selectedDest} onOpenChange={(open) => !open && setSelectedDest(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/50 bg-background gap-0 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogTitle className="sr-only">{selectedDest?.name ?? "Destination details"}</DialogTitle>
          {selectedDest && (
            <>
              {/* Hero image */}
              <div className="relative h-56 md:h-64 overflow-hidden">
                <img src={selectedDest.heroImage} alt={selectedDest.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">{selectedDest.category}</span>
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span className="font-medium">{selectedDest.rating}</span>
                      <span className="text-muted-foreground">({selectedDest.reviews.toLocaleString()} reviews)</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> {selectedDest.name}
                  </h2>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(selectedDest.id); }}
                  className="absolute top-4 right-12 w-9 h-9 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Heart className={`w-4 h-4 ${liked.has(selectedDest.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 md:p-6 space-y-5">
                {/* Quick info row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: DollarSign, label: "From", value: selectedDest.price },
                    { icon: Calendar, label: "Best Time", value: selectedDest.bestTime },
                    { icon: Globe, label: "Duration", value: selectedDest.avgDuration },
                    { icon: Users, label: "Ideal For", value: selectedDest.idealFor },
                  ].map((item) => (
                    <div key={item.label} className="glass-panel rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <item.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-medium">{item.label}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedDest.fullDescription}</p>
                </div>

                {/* Highlights */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Highlights</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDest.highlights.map((h) => (
                      <span key={h} className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/60 text-foreground border border-border/50">{h}</span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedDest.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">{tag}</span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => { toast.success(`Planning trip to ${selectedDest.name}…`); setSelectedDest(null); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Plan a Trip <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
