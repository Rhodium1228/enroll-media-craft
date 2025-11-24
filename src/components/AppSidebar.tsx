import { LayoutDashboard, Building2, Users, ClipboardList, Calendar, Package, CalendarPlus, UserCircle, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  { title: "Branch Management", url: "/branches", icon: Building2 },
  { title: "Services", url: "/services", icon: Package },
  { title: "Staff", url: "/staff", icon: Users },
  { title: "Staff Calendar", url: "/calendar", icon: Calendar },
  { title: "Appointments", url: "/appointments", icon: ClipboardList },
  { title: "Public Booking", url: "/book", icon: CalendarPlus },
  { title: "My Bookings", url: "/my-bookings", icon: UserCircle },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

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
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary/10 hover:scale-[1.02]"
                      activeClassName="bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold border-l-4 border-primary shadow-sm"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {open && <span className="truncate">{item.title}</span>}
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
