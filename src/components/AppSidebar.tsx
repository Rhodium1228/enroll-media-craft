import { useState, useEffect } from "react";
import { LayoutDashboard, Building2, Users, ClipboardList, Calendar, Package, CalendarPlus, UserCircle, Clock, MapPin, LogOut, Bell, Search } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/bms-pro-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Branch Management", url: "/branches", icon: Building2 },
  { title: "Services", url: "/services", icon: Package },
  { title: "Staff", url: "/staff", icon: Users },
  { title: "Staff Calendar", url: "/calendar", icon: Calendar },
  { title: "Clock In/Out", url: "/clock-in-out", icon: MapPin },
  { title: "Clock Records", url: "/clock-records", icon: Clock },
  { title: "Appointments", url: "/appointments", icon: ClipboardList },
  { title: "Public Booking", url: "/book", icon: CalendarPlus },
  { title: "My Bookings", url: "/my-bookings", icon: UserCircle },
  { title: "Manage Booking", url: "/manage-booking", icon: Search },
];

interface MenuCounts {
  appointments: number;
  staff: number;
  branches: number;
  notifications: number;
}

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [counts, setCounts] = useState<MenuCounts>({
    appointments: 0,
    staff: 0,
    branches: 0,
    notifications: 0,
  });

  useEffect(() => {
    fetchCounts();
    
    // Set up real-time subscriptions
    const appointmentsChannel = supabase
      .channel('sidebar-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchCounts();
      })
      .subscribe();

    const staffChannel = supabase
      .channel('sidebar-staff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        fetchCounts();
      })
      .subscribe();

    const branchesChannel = supabase
      .channel('sidebar-branches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => {
        fetchCounts();
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('sidebar-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(branchesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  const fetchCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch pending appointments count
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('date', new Date().toISOString().split('T')[0]);

      // Fetch active staff count
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('status', 'active');

      // Fetch active branches count
      const { count: branchesCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .in('status', ['active', 'pending']);

      // Fetch unread notifications count
      const { count: notificationsCount } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', user.id)
        .eq('is_read', false);

      setCounts({
        appointments: appointmentsCount || 0,
        staff: staffCount || 0,
        branches: branchesCount || 0,
        notifications: notificationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching sidebar counts:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard" || currentPath.startsWith("/branch/");
    }
    return currentPath === path;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const getBadgeForItem = (url: string) => {
    if (url === "/appointments" && counts.appointments > 0) {
      return (
        <Badge className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 min-w-[1.5rem] h-5 flex items-center justify-center px-1.5">
          {counts.appointments > 99 ? '99+' : counts.appointments}
        </Badge>
      );
    }
    if (url === "/notifications" && counts.notifications > 0) {
      return (
        <Badge variant="destructive" className="ml-auto min-w-[1.5rem] h-5 flex items-center justify-center px-1.5">
          {counts.notifications > 99 ? '99+' : counts.notifications}
        </Badge>
      );
    }
    if (url === "/staff" && counts.staff > 0) {
      return (
        <Badge variant="secondary" className="ml-auto min-w-[1.5rem] h-5 flex items-center justify-center px-1.5">
          {counts.staff}
        </Badge>
      );
    }
    if (url === "/branches" && counts.branches > 0) {
      return (
        <Badge variant="outline" className="ml-auto min-w-[1.5rem] h-5 flex items-center justify-center px-1.5">
          {counts.branches}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Sidebar className="border-r bg-sidebar" collapsible="icon">
      <SidebarHeader className="bg-gradient-to-br from-primary via-primary/90 to-accent p-6">
        <div className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="BMS PRO" 
            className={open ? "h-12 w-auto drop-shadow-lg" : "h-10 w-auto drop-shadow-lg"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 py-2">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary/10 hover:scale-[1.02] w-full"
                      activeClassName="bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold border-l-4 border-primary shadow-sm"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {open && (
                        <>
                          <span className="truncate flex-1">{item.title}</span>
                          {getBadgeForItem(item.url)}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={handleSignOut}
          size={open ? "default" : "icon"}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {open && <span>Sign Out</span>}
        </Button>
      </div>
    </Sidebar>
  );
}
