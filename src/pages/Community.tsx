import { useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageCircle, Heart, MapPin, Award, Globe, UserPlus, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

const tabs = ["Feed", "Travelers", "Groups"];

const travelers = [
  { id: 1, name: "Marco Rossi", handle: "@marcorossi", avatar: "MR", location: "Rome, Italy", trips: 47, followers: "2.3K", bio: "Slow traveler. Pasta enthusiast. Always chasing golden hour.", following: false },
  { id: 2, name: "Aiko Yamamoto", handle: "@aikoyama", avatar: "AY", location: "Tokyo, Japan", trips: 32, followers: "5.1K", bio: "Onsen explorer & temple photographer. 日本を旅する。", following: true },
  { id: 3, name: "Priya Sharma", handle: "@priyatravels", avatar: "PS", location: "Mumbai, India", trips: 28, followers: "1.8K", bio: "Budget traveler sharing tips to see the world for less.", following: false },
  { id: 4, name: "Lucas Berg", handle: "@lucasberg", avatar: "LB", location: "Stockholm, Sweden", trips: 53, followers: "3.7K", bio: "Northern lights chaser. Hiking addict. Coffee snob.", following: false },
];

const feedPosts = [
  {
    id: 1, author: "Maya Chen", avatar: "MC", handle: "@mayachen", time: "2h ago",
    content: "Just arrived in **Lisbon** and the light here is unreal! 🇵🇹 Already found the best pastel de nata at Manteigaria. The locals are so welcoming — any recommendations for hidden spots in Alfama?",
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd6b?w=600&h=300&fit=crop",
    likes: 89, comments: 12, location: "Lisbon, Portugal",
  },
  {
    id: 2, author: "Jake Torres", avatar: "JT", handle: "@jaketorres", time: "5h ago",
    content: "Hot take: **overnight trains** are the most underrated way to travel in Europe. Save on a hotel, wake up in a new city, and the rhythmic rocking puts you right to sleep. Currently on the Nightjet from Vienna to Venice 🚂",
    likes: 234, comments: 45, location: "En route to Venice",
  },
  {
    id: 3, author: "Sofia Reyes", avatar: "SR", handle: "@sofiareyes", time: "8h ago",
    content: "Completed the **Inca Trail to Machu Picchu** today and I'm literally in tears. 4 days of hiking through clouds, ancient ruins, and the most breathtaking scenery I've ever seen. Bucket list = checked ✅🏔️",
    image: "https://images.unsplash.com/photo-1587595431973-160d0d163571?w=600&h=300&fit=crop",
    likes: 456, comments: 67, location: "Machu Picchu, Peru",
  },
];

const groups = [
  { id: 1, name: "Solo Female Travelers", members: "12.4K", description: "Safe tips, destination reviews & meetup coordination for women traveling solo.", icon: "👩‍✈️" },
  { id: 2, name: "Budget Backpackers", members: "8.7K", description: "Travel the world for under $50/day. Hostels, street food & free activities.", icon: "🎒" },
  { id: 3, name: "Digital Nomads", members: "15.2K", description: "Work remotely from anywhere. Best coworking spaces, visas & WiFi tips.", icon: "💻" },
  { id: 4, name: "Photography Travelers", members: "6.3K", description: "Capture the world's beauty. Gear reviews, editing tips & photo challenges.", icon: "📸" },
];

export default function Community() {
  const [activeTab, setActiveTab] = useState("Feed");
  const [followingState, setFollowingState] = useState<Set<number>>(new Set([2]));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFollow = (id: number, name: string) => {
    setFollowingState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(`Unfollowed ${name}`); }
      else { next.add(id); toast.success(`Following ${name} ✨`); }
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Community</h1>
            <p className="text-muted-foreground">Connect with travelers, share stories, and find travel buddies</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active Travelers", value: "24.8K", icon: Users },
              { label: "Posts This Week", value: "1,247", icon: MessageCircle },
              { label: "Countries Covered", value: "142", icon: Globe },
            ].map((stat, i) => (
              <motion.div key={stat.label} className="glass-panel rounded-xl p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-lg md:text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeTab === tab ? "bg-primary/15 text-primary border border-primary/30" : "glass-panel text-muted-foreground hover:text-foreground"
                }`}
              >{tab}</button>
            ))}
          </div>

          {/* Content */}
          {activeTab === "Feed" && (
            <div className="space-y-5 pb-8">
              {feedPosts.map((post, i) => (
                <motion.div key={post.id} className="glass-panel rounded-2xl p-5 space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground">{post.avatar}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{post.author} <span className="text-muted-foreground font-normal">{post.handle}</span></p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {post.location} · {post.time}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{post.content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                    part.startsWith("**") ? <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>
                  )}</p>
                  {post.image && (
                    <div className="rounded-xl overflow-hidden">
                      <img src={post.image} alt="" className="w-full h-48 object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                    <button onClick={() => toast.success("Liked!")} className="flex items-center gap-1.5 hover:text-red-400 transition-colors"><Heart className="w-4 h-4" /> {post.likes}</button>
                    <button onClick={() => toast.info("Comments — coming soon!")} className="flex items-center gap-1.5 hover:text-primary transition-colors"><MessageCircle className="w-4 h-4" /> {post.comments}</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "Travelers" && (
            <div className="space-y-4 pb-8">
              <div className="glass-panel rounded-xl flex items-center gap-3 px-4 py-3">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search travelers…" className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none" />
              </div>
              {travelers.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((traveler, i) => (
                <motion.div key={traveler.id} className="glass-panel rounded-2xl p-4 flex items-center gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">{traveler.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{traveler.name} <span className="text-muted-foreground font-normal text-xs">{traveler.handle}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{traveler.bio}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {traveler.location}</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {traveler.trips} trips</span>
                      <span>{traveler.followers} followers</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(traveler.id, traveler.name)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      followingState.has(traveler.id)
                        ? "glass-panel text-muted-foreground hover:text-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {followingState.has(traveler.id) ? "Following" : "Follow"}
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "Groups" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              {groups.map((group, i) => (
                <motion.div key={group.id} className="glass-panel rounded-2xl p-5 card-hover cursor-pointer space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -2 }}
                  onClick={() => toast.success(`Joining ${group.name}…`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{group.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {group.members} members</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                  <button className="w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20">
                    Join Group
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
