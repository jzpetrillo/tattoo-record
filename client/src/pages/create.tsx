import { useState } from "react";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { ImageIcon, VideoIcon, Radio, Film } from "lucide-react";
import CreatePostModal from "@/components/posts/create-post-modal";
import { useLocation } from "wouter";

export default function Create() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"post" | "story" | "reel">("post");

  const handleCreate = (type: "post" | "story" | "reel" | "live") => {
    if (type === "live") {
      setLocation("/live");
    } else {
      setCreateType(type);
      setShowCreateModal(true);
    }
  };

  const createOptions = [
    {
      id: "post",
      title: "Post",
      description: "Share photos and videos to your feed",
      icon: ImageIcon,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      id: "reel",
      title: "Reel",
      description: "Create short video content",
      icon: Film,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      id: "story",
      title: "Story",
      description: "Share a moment that disappears in 24 hours",
      icon: VideoIcon,
      iconColor: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
    },
    {
      id: "live",
      title: "Go Live",
      description: "Start a live video stream",
      icon: Radio,
      iconColor: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />
      
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create</h1>
            <p className="text-muted-foreground">Share your work with the community</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {createOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleCreate(option.id as "post" | "story" | "reel" | "live")}
                  className="group relative overflow-hidden border border-border rounded-sm p-6 hover:border-foreground/20 transition-all text-left"
                  data-testid={`create-${option.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${option.bgColor} p-3 rounded-sm transition-transform group-hover:scale-110`}>
                      <Icon className={`w-6 h-6 ${option.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {user?.role === "ARTIST" && (
            <div className="mt-8 p-6 border border-border rounded-sm bg-muted/30">
              <h3 className="font-semibold mb-2">Artist Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Share high-quality images of your work</li>
                <li>• Use relevant hashtags to reach more people</li>
                <li>• Go live to show your process and connect with clients</li>
                <li>• Post reels to showcase before/after transformations</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      <MobileNav />

      <CreatePostModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
