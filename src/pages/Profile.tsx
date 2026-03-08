import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MapPin, Calendar, Users, Globe, Lock, LogOut, Edit2, Save, X, Trash2,
  Mail, Clock, Shield, Sparkles, Compass, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
}

interface SavedTrip {
  id: string;
  title: string;
  destination: string | null;
  stops: any[];
  created_at: string;
}

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", username: "", is_public: true });
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchTrips();
    fetchFollowCounts();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) {
      setProfile(data as Profile);
      setEditForm({ display_name: data.display_name || "", bio: data.bio || "", username: data.username || "", is_public: data.is_public });
    }
  };

  const fetchTrips = async () => {
    const { data } = await supabase.from("saved_trips").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setTrips(data as SavedTrip[]);
  };

  const fetchFollowCounts = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user!.id),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user!.id),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: editForm.display_name, bio: editForm.bio, username: editForm.username,
      is_public: editForm.is_public, updated_at: new Date().toISOString(),
    }).eq("id", user!.id);
    if (error) toast.error(error.message.includes("unique") ? "Username already taken" : error.message);
    else { toast.success("Profile updated!"); setEditing(false); fetchProfile(); }
    setSaving(false);
  };

  const handleDeleteTrip = async (tripId: string) => {
    const { error } = await supabase.from("saved_trips").delete().eq("id", tripId);
    if (!error) { setTrips((prev) => prev.filter((t) => t.id !== tripId)); toast.success("Trip deleted"); }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (authLoading || !profile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Loading profile…</span>
          </motion.div>
        </div>
      </div>
    );
  }

  const initials = (profile.display_name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 pt-16 overflow-y-auto scrollbar-hide">
        {/* Hero banner with gradient */}
        <div className="relative h-40 md:h-48 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, hsl(var(--secondary) / 0.12) 0%, transparent 50%)",
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-16 relative z-10 pb-12">
          {/* Profile header card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-60 blur-sm group-hover:opacity-80 transition-opacity" />
                <Avatar className="relative w-24 h-24 md:w-28 md:h-28 text-3xl border-2 border-background">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-2xl md:text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-secondary flex items-center justify-center border-2 border-background">
                  <Sparkles className="w-3.5 h-3.5 text-secondary-foreground" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 w-full">
                {editing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Display Name</Label>
                        <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="bg-muted/50 border-border/50 mt-1.5 focus:border-primary/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Username</Label>
                        <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="bg-muted/50 border-border/50 mt-1.5 focus:border-primary/50" placeholder="unique_handle" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bio</Label>
                      <Input value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="bg-muted/50 border-border/50 mt-1.5 focus:border-primary/50" placeholder="Tell the world about your travels…" />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 glass-panel rounded-xl px-4 py-2.5">
                        {editForm.is_public ? <Globe className="w-4 h-4 text-secondary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm text-foreground">Public profile</span>
                        <Switch checked={editForm.is_public} onCheckedChange={(v) => setEditForm({ ...editForm, is_public: v })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-primary hover:bg-primary/90"><Save className="w-4 h-4" /> Save</Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {profile.display_name || "Traveler"}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                        {profile.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Private</>}
                      </span>
                      <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
                        <Edit2 className="w-4 h-4" /> Edit
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">@{profile.username || "username"}</p>
                    {profile.bio && <p className="text-sm text-foreground/80 mt-2 max-w-lg">{profile.bio}</p>}

                    {/* Stats */}
                    <div className="flex gap-2 mt-5">
                      {[
                        { label: "Trips", value: trips.length, icon: Compass },
                        { label: "Followers", value: followerCount, icon: Users },
                        { label: "Following", value: followingCount, icon: Users },
                      ].map((stat) => (
                        <div key={stat.label} className="glass-panel rounded-xl px-4 py-3 flex-1 text-center hover:bg-accent/50 transition-colors cursor-default">
                          <p className="text-lg md:text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                            <stat.icon className="w-3 h-3" /> {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="trips" className="space-y-5">
            <TabsList className="bg-muted/30 border border-border/50 w-full justify-start p-1 rounded-xl">
              <TabsTrigger value="trips" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <MapPin className="w-4 h-4" /> My Trips
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Shield className="w-4 h-4" /> Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trips">
              {trips.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mx-auto mb-4">
                    <Compass className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No trips yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Plan your first adventure with our AI travel agent and it'll appear here.</p>
                  <Button className="mt-5 gap-2 bg-primary hover:bg-primary/90" onClick={() => navigate("/chat")}>
                    Start Planning <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trips.map((trip, i) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass-panel rounded-2xl p-5 card-hover group cursor-pointer relative overflow-hidden"
                      whileHover={{ y: -2 }}
                    >
                      {/* Subtle gradient accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-60" />

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center flex-shrink-0 group-hover:from-primary/25 group-hover:to-secondary/25 transition-colors">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{trip.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                            {trip.destination && (
                              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {trip.destination}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(trip.created_at).toLocaleDateString()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-accent/60 text-[10px] font-medium">
                              {(trip.stops as any[]).length} stops
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 md:p-8 space-y-0">
                {[
                  { icon: Mail, label: "Email", value: user?.email || "—", description: "Your account email address" },
                  { icon: Clock, label: "Member since", value: memberSince, description: "When you joined the platform" },
                  { icon: Shield, label: "Account ID", value: user?.id.slice(0, 8) + "…", description: "Your unique identifier" },
                ].map((item, idx) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-4 py-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4.5 h-4.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                      </div>
                    </div>
                    {idx < 2 && <Separator className="bg-border/50" />}
                  </div>
                ))}

                <div className="pt-6">
                  <Button variant="destructive" onClick={handleSignOut} className="gap-2 w-full md:w-auto">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
