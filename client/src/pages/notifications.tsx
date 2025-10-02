import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Heart, MessageCircle, UserPlus, CheckCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface Notification {
  notification: {
    id: string;
    userId: string;
    type: "FOLLOW" | "LIKE" | "COMMENT" | "APPROVAL" | "SYSTEM";
    payload: {
      actorId?: string;
      postId?: string;
      commentId?: string;
      message?: string;
    };
    isRead: boolean;
    createdAt: string;
  };
  actor?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "FOLLOW":
        return <UserPlus className="w-5 h-5" />;
      case "LIKE":
        return <Heart className="w-5 h-5" />;
      case "COMMENT":
        return <MessageCircle className="w-5 h-5" />;
      case "APPROVAL":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const { type, payload } = notification.notification;
    const actorName = notification.actor?.username || "Someone";

    switch (type) {
      case "FOLLOW":
        return `${actorName} started following you`;
      case "LIKE":
        return `${actorName} liked your post`;
      case "COMMENT":
        return `${actorName} commented on your post`;
      case "APPROVAL":
        return payload.message || `${actorName} approved your request`;
      case "SYSTEM":
        return payload.message || "System notification";
      default:
        return "New notification";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.notification.isRead) {
      markAsReadMutation.mutate(notification.notification.id);
    }

    const { type, payload } = notification.notification;
    
    if (type === "FOLLOW" && notification.actor) {
      setLocation(`/profile/${notification.actor.username}`);
    } else if ((type === "LIKE" || type === "COMMENT") && payload.postId) {
      setLocation(`/`);
    } else if (notification.actor) {
      setLocation(`/profile/${notification.actor.username}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.notification.isRead).length;

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      
      <main className="flex-1 lg:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
                className="text-sm"
              >
                Mark all as read
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border border-border rounded-sm animate-pulse"
                >
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12" data-testid="text-no-notifications">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-center gap-4 p-4 border border-border rounded-sm text-left transition-colors hover:bg-muted/50 ${
                    !notification.notification.isRead ? "bg-muted/30" : ""
                  }`}
                  data-testid={`notification-${notification.notification.id}`}
                >
                  <div className="flex-shrink-0">
                    {notification.actor?.avatarUrl ? (
                      <img
                        src={notification.actor.avatarUrl}
                        alt={notification.actor.username}
                        className="w-10 h-10 rounded-full object-cover"
                        data-testid={`img-avatar-${notification.notification.id}`}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getNotificationIcon(notification.notification.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {!notification.notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
