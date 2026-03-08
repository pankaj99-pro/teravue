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
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchTrips();
    fetchFollowCounts();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    if (data) {
      setProfile(data as Profile);
      setEditForm({
        display_name: data.display_name || "",
        bio: data.bio || "",
        username: data.username || "",
        is_public: data.is_public,
      });
    }
  };

  const fetchTrips = async () => {
    const { data } = await supabase
      .from("saved_trips")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
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
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: editForm.display_name,
        bio: editForm.bio,
        username: editForm.username,
        is_public: editForm.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user!.id);

    if (error) {
      toast.error(error.message.includes("unique") ? "Username already taken" : error.message);
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const handleDeleteTrip = async (tripId: string) => {
    const { error } = await supabase.from("saved_trips").delete().eq("id", tripId);
    if (!error) {
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      toast.success("Trip deleted");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const initials = (profile.display_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-3xl mx-auto">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start gap-5">
            <Avatar className="w-20 h-20 text-2xl">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Display Name</Label>
                      <Input
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        className="bg-muted border-border mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Username</Label>
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="bg-muted border-border mt-1"
                        placeholder="unique_handle"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Input
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="bg-muted border-border mt-1"
                      placeholder="Tell the world about your travels..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {editForm.is_public ? (
                        <Globe className="w-4 h-4 text-secondary" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-foreground">Public profile</span>
                      <Switch
                        checked={editForm.is_public}
                        onCheckedChange={(v) => setEditForm({ ...editForm, is_public: v })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-foreground">{profile.display_name}</h1>
                    {profile.is_public ? (
                      <Globe className="w-4 h-4 text-secondary" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {profile.bio && <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>}

                  <div className="flex gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{trips.length}</p>
                      <p className="text-xs text-muted-foreground">Trips</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{followerCount}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{followingCount}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="trips" className="space-y-4">
          <TabsList className="bg-muted/50 w-full justify-start">
            <TabsTrigger value="trips" className="gap-1.5">
              <MapPin className="w-4 h-4" /> Trips
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Users className="w-4 h-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {trips.length === 0 ? (
              <div className="glass-panel rounded-xl p-8 text-center">
                <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No saved trips yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Plan a trip in AI Chat and it'll show up here!
                </p>
                <Button className="mt-4" onClick={() => navigate("/chat")}>
                  Start Planning
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel rounded-xl p-4 card-hover flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{trip.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {trip.destination && <span>{trip.destination}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(trip.created_at).toLocaleDateString()}
                        </span>
                        <span>{(trip.stops as any[]).length} stops</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <div className="glass-panel rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-foreground font-medium mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Separator className="bg-border" />
              <div>
                <h3 className="text-foreground font-medium mb-1">Member since</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <Separator className="bg-border" />
              <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
