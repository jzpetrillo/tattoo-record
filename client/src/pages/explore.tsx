import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { MapPin, Globe, Building2, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserType = "ALL" | "STUDIO" | "ARTIST" | "ENTHUSIAST";

export default function Explore() {
  const { token } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>("ALL");

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users", selectedType !== "ALL" ? `?type=${selectedType}` : ""],
    enabled: !!token,
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "STUDIO":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ARTIST":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "ENTHUSIAST":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <main className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold">Explore</h1>
        </div>

        <div className="max-w-7xl mx-auto lg:pt-8 px-4">
          <h1 className="hidden lg:block text-3xl font-bold mb-6">Explore</h1>

          {/* Filter Controls */}
          <div className="mb-8">
            <Tabs 
              value={selectedType} 
              onValueChange={(value) => setSelectedType(value as UserType)}
              className="w-full"
            >
              <TabsList className="grid w-full sm:w-auto grid-cols-4 gap-2" data-testid="filter-tabs">
                <TabsTrigger value="ALL" data-testid="filter-all">All</TabsTrigger>
                <TabsTrigger value="STUDIO" data-testid="filter-studios">Studios</TabsTrigger>
                <TabsTrigger value="ARTIST" data-testid="filter-artists">Artists</TabsTrigger>
                <TabsTrigger value="ENTHUSIAST" data-testid="filter-enthusiasts">Enthusiasts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Users Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map((user) => (
                <Link 
                  key={user.id} 
                  href={`/u/${user.username}`}
                  data-testid={`user-card-${user.id}`}
                >
                  <div className="bg-card border border-border rounded-sm p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                    {/* Avatar */}
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold">
                              {user.username?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {user.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                            <Star className="w-4 h-4 text-white fill-current" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Username */}
                    <h3 className="text-center font-semibold text-lg mb-1 truncate" data-testid={`text-username-${user.id}`}>
                      {user.username}
                    </h3>

                    {/* Full Name */}
                    {(user.firstName || user.lastName) && (
                      <p className="text-center text-sm text-muted-foreground mb-2 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                    )}

                    {/* Role Badge */}
                    <div className="flex justify-center mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                      <p className="text-center text-sm text-muted-foreground line-clamp-2 mb-3">
                        {user.bio}
                      </p>
                    )}

                    {/* Type-specific Information */}
                    <div className="space-y-2 text-sm">
                      {user.role === "STUDIO" && (
                        <>
                          {user.location?.city && (
                            <div className="flex items-center gap-2 text-muted-foreground" data-testid={`location-${user.id}`}>
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{user.location.city}, {user.location.country}</span>
                            </div>
                          )}
                          {user.website && (
                            <div className="flex items-center gap-2 text-muted-foreground" data-testid={`website-${user.id}`}>
                              <Globe className="w-4 h-4 shrink-0" />
                              <span className="truncate">{user.website.replace(/^https?:\/\//, '')}</span>
                            </div>
                          )}
                        </>
                      )}

                      {user.role === "ARTIST" && (
                        <>
                          {user.location?.city && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{user.location.city}, {user.location.country}</span>
                            </div>
                          )}
                          {user.website && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="w-4 h-4 shrink-0" />
                              <span className="truncate">{user.website.replace(/^https?:\/\//, '')}</span>
                            </div>
                          )}
                        </>
                      )}

                      {user.role === "ENTHUSIAST" && user.location?.city && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{user.location.city}, {user.location.country}</span>
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
