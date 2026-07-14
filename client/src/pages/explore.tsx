import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation, useSearch } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { MapPin, Star, TrendingUp, Hash, Heart, Grid3X3, Palette, Building2, Users, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExploreGridSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";

type UserType = "ALL" | "STUDIO" | "ARTIST" | "ENTHUSIAST";

const TATTOO_STYLES = ["Traditional", "Realism", "Watercolor", "Tribal", "Japanese", "Blackwork", "Geometric", "Minimalist", "Neo-Traditional", "Dotwork", "Lettering", "Illustrative"];

export default function Explore() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  
  const getSearchParams = () => {
    const params = new URLSearchParams(searchString);
    return {
      type: (params.get("type") as UserType) || "ALL",
      style: params.get("style") || null,
      location: params.get("location") || "",
    };
  };
  
  const urlParams = getSearchParams();
  
  const [selectedType, setSelectedType] = useState<UserType>(urlParams.type);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(urlParams.style);
  const [locationFilter, setLocationFilter] = useState<string>(urlParams.location);

  const updateUrl = (type: UserType, style: string | null, location: string) => {
    const params = new URLSearchParams();
    if (type !== "ALL") params.set("type", type);
    if (style) params.set("style", style);
    if (location) params.set("location", location);
    
    const queryString = params.toString();
    navigate(queryString ? `/explore?${queryString}` : "/explore", { replace: true });
  };

  const handleTypeChange = (type: UserType) => {
    setSelectedType(type);
    if (type !== "ARTIST" && selectedStyle) {
      setSelectedStyle(null);
      updateUrl(type, null, locationFilter);
    } else {
      updateUrl(type, selectedStyle, locationFilter);
    }
  };

  const handleStyleChange = (style: string | null) => {
    setSelectedStyle(style);
    updateUrl(selectedType, style, locationFilter);
  };

  const handleLocationChange = (location: string) => {
    setLocationFilter(location);
  };

  const handleLocationBlur = () => {
    updateUrl(selectedType, selectedStyle, locationFilter);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateUrl(selectedType, selectedStyle, locationFilter);
    }
  };

  const clearFilters = () => {
    setSelectedType("ALL");
    setSelectedStyle(null);
    setLocationFilter("");
    navigate("/explore", { replace: true });
  };

  const hasActiveFilters = selectedType !== "ALL" || selectedStyle || locationFilter;

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users", selectedType !== "ALL" ? `?type=${selectedType}` : ""],
    enabled: !!token,
  });

  const { data: trendingHashtags = [] } = useQuery<any[]>({
    queryKey: ["/api/hashtags/trending?limit=10"],
    enabled: !!token,
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
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
  }, [users, selectedStyle, locationFilter]);

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

      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Discover</h1>
          <p className="text-sm text-muted-foreground">Find artists, studios, and enthusiasts</p>
        </div>

        {trendingHashtags.length > 0 && (
          <div className="mb-8" data-testid="trending-section">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-semibold uppercase text-xs tracking-[0.2em]">Trending Now</h2>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
              {trendingHashtags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/search?q=${encodeURIComponent('#' + tag.tag)}`}
                  data-testid={`trending-tag-${tag.tag}`}
                >
                  <div className="px-4 py-2 bg-black text-white rounded-none text-sm flex items-center gap-2 transition-all hover:opacity-80 cursor-pointer whitespace-nowrap">
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
            onValueChange={(value) => handleTypeChange(value as UserType)}
            className="flex-1"
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto bg-transparent p-0 gap-1 sm:gap-2" data-testid="filter-tabs">
              <TabsTrigger 
                value="ALL" 
                data-testid="filter-all"
                className="min-h-[44px] text-xs sm:text-sm data-[state=active]:bg-black data-[state=active]:text-white rounded-none border border-border"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="STUDIO" 
                data-testid="filter-studios"
                className="min-h-[44px] text-xs sm:text-sm data-[state=active]:bg-black data-[state=active]:text-white rounded-none border border-border"
              >
                Studios
              </TabsTrigger>
              <TabsTrigger 
                value="ARTIST" 
                data-testid="filter-artists"
                className="min-h-[44px] text-xs sm:text-sm data-[state=active]:bg-black data-[state=active]:text-white rounded-none border border-border"
              >
                Artists
              </TabsTrigger>
              <TabsTrigger 
                value="ENTHUSIAST" 
                data-testid="filter-enthusiasts"
                className="min-h-[44px] text-xs sm:text-sm data-[state=active]:bg-black data-[state=active]:text-white rounded-none border border-border"
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
                  onChange={(e) => handleStyleChange(e.target.value || null)}
                  className="w-full px-4 py-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
                onChange={(e) => handleLocationChange(e.target.value)}
                onBlur={handleLocationBlur}
                onKeyDown={handleLocationKeyDown}
                placeholder="Search by location..."
                className="w-full px-4 py-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black"
                data-testid="filter-location"
              />
            </div>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-auto py-3 px-4"
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {selectedType !== "ALL" && (
                <span className="px-3 py-1 bg-black text-white text-xs font-medium">
                  {selectedType.charAt(0) + selectedType.slice(1).toLowerCase()}
                </span>
              )}
              {selectedStyle && (
                <span className="px-3 py-1 bg-black text-white text-xs font-medium">
                  Style: {selectedStyle}
                </span>
              )}
              {locationFilter && (
                <span className="px-3 py-1 bg-black text-white text-xs font-medium">
                  Location: {locationFilter}
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <ExploreGridSkeleton count={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Grid3X3}
            title="No users found"
            description="Try adjusting your search filters to find what you're looking for."
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredUsers.length} {filteredUsers.length === 1 ? "result" : "results"}
            </p>
            <div className="grid grid-cols-3 gap-px bg-foreground">
              {filteredUsers.map((user, idx) => (
                <Link 
                  key={user.id} 
                  href={`/u/${user.username}`}
                  data-testid={`user-card-${user.id}`}
                >
                  <div className="group bg-background cursor-pointer relative overflow-hidden aspect-square">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <span className="text-6xl font-bold text-muted-foreground/50">
                          {user.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* index */}
                    <span className="absolute top-1 left-1.5 font-mono text-[10px] text-white/70 leading-none">{String(idx + 1).padStart(2, "0")}</span>
                    {/* verified */}
                    {user.isVerified && (
                      <div className="absolute top-2 right-2 bg-cobalt p-1">
                        <Star className="w-3 h-3 text-white fill-current" />
                      </div>
                    )}
                    {/* hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="font-mono text-xs text-white font-bold uppercase tracking-widest line-clamp-1" data-testid={`text-username-${user.id}`}>{user.username}</p>
                      <div className="flex items-center gap-1 text-white/70 mt-0.5">
                        {getRoleIcon(user.role)}
                        <span className="font-mono text-[10px] uppercase">{user.role}</span>
                        {user.location?.city && (
                          <span className="font-mono text-[10px] text-white/50 ml-1">{user.location.city}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
