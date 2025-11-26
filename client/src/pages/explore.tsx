import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { MapPin, Star, TrendingUp, Hash, Heart, Grid3X3, Palette, Building2, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserType = "ALL" | "STUDIO" | "ARTIST" | "ENTHUSIAST";

const TATTOO_STYLES = ["Traditional", "Realism", "Watercolor", "Tribal", "Japanese", "Blackwork", "Geometric", "Minimalist", "Neo-Traditional", "Dotwork", "Lettering", "Illustrative"];

export default function Explore() {
  const { token } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>("ALL");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>("");

  useEffect(() => {
    if (selectedType !== "ARTIST" && selectedStyle) {
      setSelectedStyle(null);
    }
  }, [selectedType, selectedStyle]);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users", selectedType !== "ALL" ? `?type=${selectedType}` : ""],
    enabled: !!token,
  });

  const { data: trendingHashtags = [] } = useQuery<any[]>({
    queryKey: ["/api/hashtags/trending?limit=10"],
    enabled: !!token,
  });

  const filteredUsers = users.filter(user => {
    if (selectedStyle && user.role === "ARTIST") {
      const userStyles = user.styles || [];
      if (!userStyles.includes(selectedStyle)) return false;
    }
    if (locationFilter) {
      const city = user.location?.city?.toLowerCase() || "";
      const country = user.location?.country?.toLowerCase() || "";
      const query = locationFilter.toLowerCase();
      if (!city.includes(query) && !country.includes(query)) return false;
    }
    return true;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "STUDIO":
        return <Building2 className="w-3 h-3" />;
      case "ARTIST":
        return <Palette className="w-3 h-3" />;
      case "ENTHUSIAST":
        return <Heart className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8">
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">Explore</h1>
        </div>

        <div className="max-w-7xl mx-auto lg:pt-8">
          <div className="px-4 lg:px-6">
            <h1 className="hidden lg:block text-4xl font-bold mb-2 tracking-tight">Discover</h1>
            <p className="hidden lg:block text-muted-foreground mb-8">Find artists, studios, and enthusiasts</p>

            {trendingHashtags.length > 0 && (
              <div className="mb-8" data-testid="trending-section">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <h2 className="font-semibold uppercase text-xs tracking-[0.2em]">Trending Now</h2>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
                  {trendingHashtags.map((tag: any) => (
                    <Link
                      key={tag.id}
                      href={`/search?q=${encodeURIComponent('#' + tag.tag)}`}
                      data-testid={`trending-tag-${tag.tag}`}
                    >
                      <div className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-none text-sm flex items-center gap-2 transition-all hover:opacity-80 cursor-pointer whitespace-nowrap">
                        <Hash className="w-3 h-3" />
                        <span className="font-medium">{tag.tag}</span>
                        <span className="opacity-60 text-xs">
                          {tag.count > 1000 ? `${(tag.count / 1000).toFixed(1)}k` : tag.count}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8 space-y-4">
              <Tabs 
                value={selectedType} 
                onValueChange={(value) => setSelectedType(value as UserType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 h-12 bg-transparent p-0 gap-2" data-testid="filter-tabs">
                  <TabsTrigger 
                    value="ALL" 
                    data-testid="filter-all"
                    className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black rounded-none border border-border"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="STUDIO" 
                    data-testid="filter-studios"
                    className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black rounded-none border border-border"
                  >
                    Studios
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ARTIST" 
                    data-testid="filter-artists"
                    className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black rounded-none border border-border"
                  >
                    Artists
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ENTHUSIAST" 
                    data-testid="filter-enthusiasts"
                    className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black rounded-none border border-border"
                  >
                    Enthusiasts
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-3">
                {selectedType === "ARTIST" && (
                  <div className="flex-1">
                    <select
                      value={selectedStyle || ""}
                      onChange={(e) => setSelectedStyle(e.target.value || null)}
                      className="w-full px-4 py-3 border border-border rounded-none bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                      data-testid="filter-style"
                    >
                      <option value="">All Styles</option>
                      {TATTOO_STYLES.map(style => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-1">
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Search by location..."
                    className="w-full px-4 py-3 border border-border rounded-none bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    data-testid="filter-location"
                  />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/5] bg-secondary animate-pulse" />
                ))}
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-24">
              <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-light text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
              {filteredUsers.map((user) => (
                <Link 
                  key={user.id} 
                  href={`/u/${user.username}`}
                  data-testid={`user-card-${user.id}`}
                >
                  <div className="group relative bg-background overflow-hidden cursor-pointer">
                    <div className="aspect-[4/5] w-full overflow-hidden bg-secondary">
                      <img
                        src={`https://picsum.photos/seed/${user.id}/800/1000`}
                        alt={user.username}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-2 border-white/40">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {user.username?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg truncate" data-testid={`text-username-${user.id}`}>
                              {user.username}
                            </h3>
                            {user.isVerified && (
                              <Star className="w-4 h-4 text-yellow-400 fill-current shrink-0" />
                            )}
                          </div>
                          {(user.firstName || user.lastName) && (
                            <p className="text-sm text-white/70 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                          {getRoleIcon(user.role)}
                          <span className="text-xs font-medium">{user.role}</span>
                        </div>
                        
                        {user.location?.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            <span className="text-xs truncate">{user.location.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-background">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{user.username}</span>
                          {user.isVerified && (
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary rounded-full text-xs">
                          {getRoleIcon(user.role)}
                          <span>{user.role.toLowerCase()}</span>
                        </div>
                      </div>
                      
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{user.bio}</p>
                      )}
                      
                      {user.location?.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <MapPin className="w-3 h-3" />
                          <span>{user.location.city}, {user.location.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
