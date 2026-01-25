import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Heart, MessageCircle, UserPlus, CheckCircle, Bell, UserCheck, Eye, Calendar } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { NotificationSkeleton } from "@/components/ui/skeletons";

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
      type?: string;
      bookingId?: string;
      artistName?: string;
      scheduledAt?: string;
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

type GroupedNotifications = {
  label: string;
  notifications: Notification[];
}[];

export default function Notifications() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/read`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/read-all", {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const followBackMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/users/${userId}/follow`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string, payload?: { type?: string }) => {
    if (type === "SYSTEM" && payload?.type === "BOOKING_REMINDER") {
      return <Calendar className="w-5 h-5 text-blue-500" />;
    }
    switch (type) {
      case "FOLLOW":
        return <UserPlus className="w-5 h-5" />;
      case "LIKE":
        return <Heart className="w-5 h-5 fill-red-500 text-red-500" />;
      case "COMMENT":
        return <MessageCircle className="w-5 h-5" />;
      case "APPROVAL":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const { type, payload } = notification.notification;
    const actorName = notification.actor?.username || "Someone";

    switch (type) {
      case "FOLLOW":
        return <><span className="font-semibold">{actorName}</span> started following you</>;
      case "LIKE":
        return <><span className="font-semibold">{actorName}</span> liked your post</>;
      case "COMMENT":
        return <><span className="font-semibold">{actorName}</span> commented on your post</>;
      case "APPROVAL":
        return payload.message || <><span className="font-semibold">{actorName}</span> approved your request</>;
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
    
    // Handle booking reminder - navigate to bookings page
    if (type === "SYSTEM" && payload.type === "BOOKING_REMINDER") {
      setLocation("/bookings");
      return;
    }
    
    if (type === "FOLLOW" && notification.actor) {
      setLocation(`/u/${notification.actor.username}`);
    } else if ((type === "LIKE" || type === "COMMENT") && payload.postId) {
      setLocation(`/`);
    } else if (notification.actor) {
      setLocation(`/u/${notification.actor.username}`);
    }
  };

  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "MMMM d, yyyy");
  };

  const groupNotificationsByDate = (notifications: Notification[]): GroupedNotifications => {
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      const label = getDateLabel(notification.notification.createdAt);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(notification);
    });

    const orderedLabels = ["Today", "Yesterday"];
    const result: GroupedNotifications = [];
    
    orderedLabels.forEach(label => {
      if (groups[label]) {
        result.push({ label, notifications: groups[label] });
        delete groups[label];
      }
    });
    
    Object.entries(groups)
      .sort((a, b) => {
        const dateA = new Date(a[1][0].notification.createdAt);
        const dateB = new Date(b[1][0].notification.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .forEach(([label, notifs]) => {
        result.push({ label, notifications: notifs });
      });

    return result;
  };

  const unreadCount = notifications.filter(n => !n.notification.isRead).length;
  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
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
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12" data-testid="text-no-notifications">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              When someone follows you or likes your posts, you'll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.notifications.map((notification) => (
                    <div
                      key={notification.notification.id}
                      className={`flex items-center gap-4 p-4 border border-border text-left transition-colors hover:bg-muted/50 ${
                        !notification.notification.isRead ? "bg-muted/30 border-l-2 border-l-primary" : ""
                      }`}
                      data-testid={`notification-${notification.notification.id}`}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-shrink-0"
                      >
                        {notification.actor?.avatarUrl ? (
                          <img
                            src={notification.actor.avatarUrl}
                            alt={notification.actor.username}
                            className="w-12 h-12 rounded-full object-cover"
                            data-testid={`img-avatar-${notification.notification.id}`}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {getNotificationIcon(notification.notification.type, notification.notification.payload)}
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notification.notification.type === "FOLLOW" && notification.actor && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              followBackMutation.mutate(notification.actor!.id);
                            }}
                              disabled={followBackMutation.isPending}
                              data-testid={`button-follow-back-${notification.notification.id}`}
                              className="text-xs"
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Follow back
                            </Button>
                          )}

                          {(notification.notification.type === "LIKE" || notification.notification.type === "COMMENT") && notification.notification.payload.postId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              data-testid={`button-view-post-${notification.notification.id}`}
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}

                          {notification.notification.type === "SYSTEM" && notification.notification.payload.type === "BOOKING_REMINDER" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation("/bookings");
                              }}
                              data-testid={`button-view-booking-${notification.notification.id}`}
                              className="text-xs"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              View Booking
                            </Button>
                          )}

                          {!notification.notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>

      <MobileNav />
    </div>
  );
}
