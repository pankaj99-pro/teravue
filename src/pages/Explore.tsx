import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Heart, Filter, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

const categories = ["All", "Beaches", "Mountains", "Cities", "Historical", "Adventure", "Romantic"];

const destinations = [
  {
    id: 1, name: "Santorini, Greece", category: "Beaches",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=400&fit=crop",
    rating: 4.9, reviews: 2847, price: "$1,200", description: "Iconic white-washed buildings with stunning sunsets over the Aegean Sea.",
    tags: ["Island", "Romantic", "Photography"],
  },
  {
    id: 2, name: "Kyoto, Japan", category: "Historical",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop",
    rating: 4.8, reviews: 3156, price: "$950", description: "Ancient temples, bamboo forests, and traditional tea ceremonies.",
    tags: ["Culture", "Temples", "Nature"],
  },
  {
    id: 3, name: "Swiss Alps", category: "Mountains",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&h=400&fit=crop",
    rating: 4.9, reviews: 1923, price: "$2,100", description: "Majestic peaks, pristine lakes, and world-class skiing.",
    tags: ["Skiing", "Hiking", "Scenic"],
  },
  {
    id: 4, name: "Marrakech, Morocco", category: "Cities",
    image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&h=400&fit=crop",
    rating: 4.6, reviews: 2104, price: "$680", description: "Vibrant souks, stunning riads, and rich cultural heritage.",
    tags: ["Markets", "Culture", "Food"],
  },
  {
    id: 5, name: "Patagonia, Argentina", category: "Adventure",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop",
    rating: 4.8, reviews: 987, price: "$1,800", description: "Dramatic glaciers, wild landscapes, and epic trekking routes.",
    tags: ["Trekking", "Wildlife", "Glaciers"],
  },
  {
    id: 6, name: "Amalfi Coast, Italy", category: "Romantic",
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=400&fit=crop",
    rating: 4.7, reviews: 2563, price: "$1,400", description: "Cliffside villages, turquoise waters, and incredible Italian cuisine.",
    tags: ["Coastal", "Food", "Romantic"],
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
                onClick={() => toast.success(`Opening ${dest.name} details…`)}
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
    </div>
  );
}
