import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Star, Clock, MapPin, DollarSign, ExternalLink, Camera, Share2 } from "lucide-react";

export interface ActivityDetail {
  id: number;
  title: string;
  location: string;
  image: string;
  rating?: number;
  ratingCount?: number;
  price?: string;
  priceLabel?: string;
  openStatus?: string;
  city?: string;
  country?: string;
  description?: string;
  popularThings?: { name: string; description: string; image?: string }[];
  dayTitle?: string;
}

interface ActivityDetailPanelProps {
  activity: ActivityDetail;
  onClose: () => void;
}

const TABS = ["Overview", "Activities", "Tickets", "Location", "Review"];

export function ActivityDetailPanel({ activity, onClose }: ActivityDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [imageIndex, setImageIndex] = useState(0);

  const description = activity.description || 
    `${activity.title} is a must-visit destination located in ${activity.location}. Known for its unique atmosphere and cultural significance, this spot offers visitors an unforgettable experience. Whether you're looking to explore local history, enjoy the architecture, or simply soak in the ambiance, this is a place that shouldn't be missed on your itinerary.`;

  const popularThings = activity.popularThings || [
    { name: "Main Attraction", description: `The highlight of ${activity.title}`, image: activity.image },
    { name: "Local Experience", description: "Authentic cultural immersion", image: activity.image },
    { name: "Hidden Gem", description: "A lesser-known treasure nearby", image: activity.image },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-md max-h-[90vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{activity.dayTitle || "Back"}</span>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Image */}
          <div className="relative aspect-[16/9] overflow-hidden">
            <img src={activity.image} alt={activity.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {/* Image nav */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <button className="p-1 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Meta */}
          <div className="px-4 pt-4 pb-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground font-display leading-tight">{activity.title}</h2>
              {activity.rating && (
                <div className="flex items-center gap-1 flex-shrink-0 bg-accent/60 px-2 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-foreground">{activity.rating}/5</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {activity.price && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span className="text-secondary font-medium">from {activity.price}</span>
                </span>
              )}
              {activity.openStatus && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.openStatus}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activity.location}
                {activity.city && `, ${activity.city}`}
                {activity.country && ` ${activity.country}`}
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex px-4 gap-0 overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      layoutId="activity-tab-indicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-4 py-4 space-y-5">
            {activeTab === "Overview" && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-display mb-2">Description</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description.length > 200 ? (
                      <>
                        {description.slice(0, 200)}...
                        <button className="text-primary font-medium ml-1 hover:underline">Read more</button>
                      </>
                    ) : (
                      description
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground font-display mb-3">Popular Things</h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {popularThings.map((thing, i) => (
                      <div key={i} className="flex-shrink-0 w-28 rounded-xl overflow-hidden bg-accent/40 border border-border/50 cursor-pointer hover:border-primary/30 transition-colors">
                        <div className="aspect-[4/3] overflow-hidden">
                          <img src={thing.image || activity.image} alt={thing.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{thing.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{thing.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "Activities" && (
              <div className="text-xs text-muted-foreground text-center py-8">
                Activities information coming soon
              </div>
            )}

            {activeTab === "Tickets" && (
              <div className="space-y-3">
                <div className="rounded-xl bg-accent/40 border border-border/50 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">General Admission</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.price || "Free"} {activity.priceLabel || ""}</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    Book Now
                  </button>
                </div>
              </div>
            )}

            {activeTab === "Location" && (
              <div className="space-y-3">
                <div className="rounded-xl bg-accent/40 border border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-sm text-foreground">{activity.location}</p>
                  </div>
                  <button className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Open in Maps
                  </button>
                </div>
              </div>
            )}

            {activeTab === "Review" && (
              <div className="text-xs text-muted-foreground text-center py-8">
                Reviews coming soon
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
