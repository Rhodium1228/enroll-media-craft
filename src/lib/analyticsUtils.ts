import { supabase } from "@/integrations/supabase/client";

export interface DashboardAnalytics {
  kpis: {
    totalRevenue: number;
    totalAppointments: number;
    activeBranches: number;
    uniqueCustomers: number;
    avgRevenuePerAppointment: number;
    staffUtilization: number;
  };
  branchData: Array<{
    id: string;
    name: string;
    logo_url?: string;
    revenue: number;
    appointments: number;
    staffCount: number;
    topService?: string;
    utilization: number;
  }>;
  topServices: Array<{
    id: string;
    title: string;
    image_url?: string;
    bookings: number;
    revenue: number;
    trend: "up" | "down";
  }>;
  topStaff: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
    appointments: number;
    revenue: number;
    branches: string[];
  }>;
  customerStats: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    atRiskCustomers: number;
    repeatRate: number;
  };
}

export async function fetchDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  // Fetch appointments with related data
  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      *,
      services(cost, title, image_url),
      branches(id, name, logo_url),
      staff(id, first_name, last_name, profile_image_url)
    `)
    .eq("created_by", userId);

  // Fetch branches
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("created_by", userId);

  // Fetch staff with assignments
  const { data: staff } = await supabase
    .from("staff")
    .select(`
      *,
      staff_branches(branch_id)
    `)
    .eq("created_by", userId);

  // Calculate KPIs
  const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.services?.cost || 0), 0) || 0;
  const totalAppointments = appointments?.length || 0;
  const uniqueCustomers = new Set(appointments?.map(apt => apt.customer_email || apt.customer_phone)).size;
  const avgRevenuePerAppointment = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  // Calculate branch data with metrics
  const branchData = branches?.map(branch => {
    const branchAppointments = appointments?.filter(apt => apt.branch_id === branch.id) || [];
    const branchRevenue = branchAppointments.reduce((sum, apt) => sum + (apt.services?.cost || 0), 0);
    const branchStaffCount = staff?.filter(s => 
      s.staff_branches?.some((sb: any) => sb.branch_id === branch.id)
    ).length || 0;

    // Calculate top service for this branch
    const serviceBookings = branchAppointments.reduce((acc, apt) => {
      const serviceTitle = apt.services?.title || "Unknown";
      acc[serviceTitle] = (acc[serviceTitle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topService = Object.entries(serviceBookings).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Calculate utilization (simplified - appointments vs potential capacity)
    const utilization = Math.min(100, Math.round((branchAppointments.length / Math.max(1, branchStaffCount * 10)) * 100));

    return {
      id: branch.id,
      name: branch.name,
      logo_url: branch.logo_url || undefined,
      revenue: branchRevenue,
      appointments: branchAppointments.length,
      staffCount: branchStaffCount,
      topService,
      utilization
    };
  }) || [];

  // Calculate top services
  const serviceStats = appointments?.reduce((acc, apt) => {
    const serviceId = apt.service_id;
    if (!serviceId) return acc;
    
    if (!acc[serviceId]) {
      acc[serviceId] = {
        id: serviceId,
        title: apt.services?.title || "Unknown",
        image_url: apt.services?.image_url,
        bookings: 0,
        revenue: 0,
        trend: "up" as const
      };
    }
    acc[serviceId].bookings += 1;
    acc[serviceId].revenue += apt.services?.cost || 0;
    return acc;
  }, {} as Record<string, any>) || {};

  const topServices = Object.values(serviceStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate top staff
  const staffStats = appointments?.reduce((acc, apt) => {
    const staffId = apt.staff_id;
    if (!staffId) return acc;
    
    if (!acc[staffId]) {
      const staffMember = staff?.find(s => s.id === staffId);
      acc[staffId] = {
        id: staffId,
        first_name: staffMember?.first_name || "Unknown",
        last_name: staffMember?.last_name || "",
        profile_image_url: staffMember?.profile_image_url,
        appointments: 0,
        revenue: 0,
        branches: staffMember?.staff_branches?.map((sb: any) => sb.branch_id) || []
      };
    }
    acc[staffId].appointments += 1;
    acc[staffId].revenue += apt.services?.cost || 0;
    return acc;
  }, {} as Record<string, any>) || {};

  const topStaff = Object.values(staffStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate customer stats
  const customerMap = new Map<string, { firstVisit: string; visits: number }>();
  appointments?.forEach(apt => {
    const customerId = apt.customer_email || apt.customer_phone;
    if (!customerId) return;
    
    const existing = customerMap.get(customerId);
    if (!existing) {
      customerMap.set(customerId, { firstVisit: apt.date, visits: 1 });
    } else {
      existing.visits += 1;
      if (apt.date < existing.firstVisit) {
        existing.firstVisit = apt.date;
      }
    }
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newCustomers = Array.from(customerMap.values()).filter(c => 
    new Date(c.firstVisit) >= thirtyDaysAgo
  ).length;
  const returningCustomers = Array.from(customerMap.values()).filter(c => c.visits > 1).length;
  const atRiskCustomers = 0; // Would need last visit date tracking
  const repeatRate = uniqueCustomers > 0 ? Math.round((returningCustomers / uniqueCustomers) * 100) : 0;

  return {
    kpis: {
      totalRevenue,
      totalAppointments,
      activeBranches: branches?.length || 0,
      uniqueCustomers,
      avgRevenuePerAppointment,
      staffUtilization: 0 // Would need more complex calculation
    },
    branchData,
    topServices,
    topStaff,
    customerStats: {
      totalCustomers: uniqueCustomers,
      newCustomers,
      returningCustomers,
      atRiskCustomers,
      repeatRate
    }
  };
}
