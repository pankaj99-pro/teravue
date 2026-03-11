import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageCircle, Heart, MapPin, Search, ChevronLeft, ChevronDown, Plus, Share2, Play, Bookmark, MoreVertical, Link2, Check, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

interface CommunityGroup {
  id: number;
  name: string;
  icon: string;
  category: string;
  members: string;
  memberCount: number;
  unreadCount?: number;
}

const followingCommunities: CommunityGroup[] = [
  { id: 1, name: "Backpackers on Budget", icon: "🎒", category: "Travel Style", members: "32.7K", memberCount: 32700, unreadCount: 4 },
  { id: 2, name: "Foodies Explorer", icon: "🍜", category: "Food", members: "47.2K", memberCount: 47200, unreadCount: 12 },
  { id: 3, name: "No Dive No Life", icon: "🤿", category: "Adventure", members: "24.1K", memberCount: 24100 },
  { id: 4, name: "Island Hoppers", icon: "🏝️", category: "Nature", members: "18.2K", memberCount: 18200, unreadCount: 7 },
];

const suggestedCommunities: CommunityGroup[] = [
  { id: 5, name: "Culture Seekers", icon: "🎭", category: "Arts", members: "21.9K", memberCount: 21900 },
  { id: 6, name: "Scenic Train Journeys", icon: "🚂", category: "Travel Style", members: "52.1K", memberCount: 52100 },
  { id: 7, name: "Wine Lovers & Tastings", icon: "🍷", category: "Food", members: "13.4K", memberCount: 13400 },
  { id: 8, name: "Hidden Gems Around the World", icon: "💎", category: "Travel Style", members: "30.2K", memberCount: 30200 },
  { id: 9, name: "Art Enthusiasts United", icon: "🎨", category: "Arts", members: "18.7K", memberCount: 18700 },
  { id: 10, name: "Gourmet Home Cooking", icon: "👨‍🍳", category: "Food", members: "25.5K", memberCount: 25500 },
];

interface FeedPost {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  badge?: string;
  communityName?: string;
  content: string;
  linkPreview?: { url: string; title: string; description: string; image?: string };
  image?: string;
  hasVideo?: boolean;
  likes: string;
  comments: number;
  shares: string;
  time: string;
}

const feedPosts: FeedPost[] = [
  {
    id: 1,
    author: "Geisha Azahra",
    handle: "@geisealova",
    avatar: "GA",
    badge: "Member",
    communityName: "No Dive No Life",
    content: "Covers buoyancy control and managing air consumption. Thought this might help anyone starting out!",
    linkPreview: {
      url: "divelifejournal.com/safety-tips",
      title: "10 Essential Safety Tips for Beginner Divers",
      description: "Learn the fundamentals of safe diving, from gear checks to managing underwater...",
    },
    likes: "14.7K",
    comments: 304,
    shares: "2.9K",
    time: "September 12, 2025",
  },
  {
    id: 2,
    author: "Geisha Azahra",
    handle: "@geisealova",
    avatar: "GA",
    badge: "Member",
    communityName: "No Dive No Life",
    content: "Anyone tracking manta ray migrations this season? Spotted some near Komodo 🐟✨\n\n#mantarays #komodo #migrations #like4like",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&h=400&fit=crop",
    hasVideo: true,
    likes: "14.7K",
    comments: 304,
    shares: "2.9K",
    time: "September 12, 2025",
  },
  {
    id: 3,
    author: "Adera S. Putera",
    handle: "@deragottadive",
    avatar: "AP",
    badge: "Member",
    communityName: "No Dive No Life",
    content: "Planning my very first diving trip to Bali next month 🌊🐠. I've heard Amed is great for beginners because of the calm waters, but Nusa Penida has manta rays which sounds amazing!",
    likes: "3.2K",
    comments: 89,
    shares: "456",
    time: "September 11, 2025",
  },
];

const communityDetail = {
  name: "No Dive No Life",
  icon: "🤿",
  members: "24.1K",
  creator: "@deepbluezed",
  dateCreated: "Jan 15, 2019",
  category: "Adventure",
  tags: ["#diving", "#ocean", "#nature", "#adventure", "#sea"],
  description: "A global hub for diving enthusiasts — from first-time snorkelers to deep-sea adventurers. Share your dive logs, favorite underwater photos, safety...",
  rules: [
    "Respect all divers and cultures.",
    "Share safe, verified dive tips only.",
    "Always credit original content creators.",
    'No spam; gear sales must use "Marketplace" tag.',
    "Keep posts travel- and dive-related.",
  ],
  roles: [
    { name: "Member", count: "24,127 members" },
    { name: "Top Contributor", count: "43 members" },
    { name: "Moderator", count: "5 members" },
  ],
};

export default function Community() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityGroup | null>(followingCommunities[2]);
  const [showDetail, setShowDetail] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex-1 pt-16 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className={`border-r border-border bg-card/50 overflow-y-auto scrollbar-hide transition-all duration-300 flex-shrink-0 ${
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64 lg:w-72"
        } hidden md:block`}>
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground font-display">Community</h2>
              <button onClick={() => setSidebarCollapsed(true)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg bg-accent/60 border border-border/50 px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search community"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {/* Following */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Following</h3>
              <div className="space-y-1">
                {followingCommunities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCommunity(c); setShowDetail(true); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      selectedCommunity?.id === c.id ? "bg-accent border border-border" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{c.category} · {c.members} members</p>
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    </div>
                    {c.unreadCount && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suggested</h3>
              <div className="space-y-1">
                {suggestedCommunities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCommunity(c); setShowDetail(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{c.category} · {c.members} members</p>
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    </div>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              See All Community →
            </button>
          </div>
        </div>

        {/* Main Feed */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {/* Mobile community selector */}
            <div className="md:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
              {followingCommunities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCommunity(c); setShowDetail(true); }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
                    selectedCommunity?.id === c.id
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <span>{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>

            {feedPosts.map((post, i) => (
              <motion.div
                key={post.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">
                      {post.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{post.author}</span>
                        {post.badge && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{post.badge}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{post.handle}</p>
                    </div>
                    {post.communityName && (
                      <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent border border-border text-xs font-medium text-foreground flex-shrink-0">
                        {post.communityName}
                      </span>
                    )}
                    <button className="p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {post.content.split(/(#\w+)/g).map((part, j) =>
                      part.startsWith("#") ? (
                        <span key={j} className="text-primary cursor-pointer hover:underline">{part}</span>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>

                  {/* Link preview */}
                  {post.linkPreview && (
                    <div className="rounded-xl border border-border overflow-hidden bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="px-4 py-2 text-xs text-primary flex items-center gap-1.5">
                        <Link2 className="w-3 h-3" />
                        {post.linkPreview.url}
                      </div>
                      <div className="flex gap-3 px-4 pb-3">
                        {post.linkPreview.image && (
                          <img src={post.linkPreview.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Blog Preview</p>
                          <p className="text-sm font-semibold text-foreground leading-snug">{post.linkPreview.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{post.linkPreview.description}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image */}
                  {post.image && (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={post.image} alt="" className="w-full aspect-video object-cover" />
                      {post.hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
                            <Play className="w-6 h-6 text-white ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-5 text-xs text-muted-foreground">
                      <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                        <Heart className="w-4 h-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Share2 className="w-4 h-4" />
                        {post.shares}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                        <Bookmark className="w-4 h-4" />
                        Add to collection
                      </button>
                      <span className="hidden sm:inline">{post.time}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Detail Panel */}
        {showDetail && selectedCommunity && (
          <div className="w-80 xl:w-96 border-l border-border bg-card/50 overflow-y-auto scrollbar-hide flex-shrink-0 hidden lg:block">
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button onClick={() => setShowDetail(false)} className="hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Community Detail</span>
                <div className="ml-auto">
                  <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Community card */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{communityDetail.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground font-display">{communityDetail.name}</h3>
                  <p className="text-xs text-muted-foreground">{communityDetail.members} members ›</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground">Community Overview</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creator</span>
                    <span className="text-secondary font-medium">{communityDetail.creator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date created</span>
                    <span className="text-foreground">{communityDetail.dateCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-foreground">{communityDetail.category}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {communityDetail.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full bg-accent text-[10px] font-medium text-muted-foreground border border-border/50">
                      {tag}
                    </span>
                  ))}
                  <span className="px-2 py-1 rounded-full bg-accent text-[10px] font-medium text-muted-foreground border border-border/50">+3</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                  Create Post <Plus className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground text-xs font-medium hover:bg-accent/80 transition-colors">
                  Share <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-2">Description</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {communityDetail.description}
                  <button className="text-primary font-medium ml-1 hover:underline">Read more</button>
                </p>
              </div>

              {/* Rules */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-2">Community Rules</h4>
                <div className="space-y-2">
                  {communityDetail.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs text-foreground/80 leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-2">Member Role</h4>
                <div className="space-y-2">
                  {communityDetail.roles.map((role) => (
                    <div key={role.name} className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{role.name}</span>
                      <span className="text-muted-foreground">{role.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
