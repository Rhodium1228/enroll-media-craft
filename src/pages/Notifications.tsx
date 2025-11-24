import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, MapPin, Clock, User, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  notification_type: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
  staff: {
    first_name: string;
    last_name: string;
  };
  branches: {
    name: string;
  };
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("admin_notifications")
        .select(`
          *,
          staff:staff_id (first_name, last_name),
          branches:branch_id (name)
        `)
        .eq("admin_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      toast.success("Marked as read");
      fetchNotifications();
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("admin_id", userData.user.id)
        .eq("is_read", false);

      if (error) throw error;
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const filteredNotifications = notifications.filter((n) => 
    filter === "all" ? true : !n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-white py-12">Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications
            </h1>
            <p className="text-white/80 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="secondary">
              <Check className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-primary">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-white data-[state=active]:text-primary">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-6">
            {filteredNotifications.length === 0 ? (
              <Card className="border-2 hover:border-primary/20">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No notifications to display</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-2 hover:border-primary/20 transition-all ${
                    !notification.is_read ? "bg-primary/5 border-primary/30" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={notification.is_read ? "secondary" : "default"}>
                            {notification.notification_type === "geofence_violation" 
                              ? "Geofence Violation" 
                              : notification.notification_type}
                          </Badge>
                          {!notification.is_read && (
                            <Badge variant="destructive">New</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{notification.message}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>
                        {notification.staff.first_name} {notification.staff.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{notification.branches.name}</span>
                    </div>
                    {notification.metadata.distance && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          Distance: {notification.metadata.distance}m away (Allowed: {notification.metadata.allowed_radius}m)
                        </span>
                      </div>
                    )}
                    {notification.metadata.action && (
                      <div className="text-sm">
                        <Badge variant="outline">
                          Action: {notification.metadata.action.replace("_", " ")}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
