import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { BranchComparisonTable } from "@/components/dashboard/BranchComparisonTable";
import { TopServicesCard } from "@/components/dashboard/TopServicesCard";
import { StaffLeaderboard } from "@/components/dashboard/StaffLeaderboard";
import { CustomerInsights } from "@/components/dashboard/CustomerInsights";
import { fetchDashboardAnalytics, DashboardAnalytics } from "@/lib/analyticsUtils";
import { Skeleton } from "@/components/ui/skeleton";

const BranchDashboard = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const data = await fetchDashboardAnalytics(user.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Enterprise-level insights and performance metrics</p>
        </div>
        <Button onClick={() => navigate('/')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Branch
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Revenue"
          value={`$${analytics.kpis.totalRevenue.toFixed(2)}`}
          change={8.2}
          changeLabel="vs last month"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Appointments"
          value={analytics.kpis.totalAppointments}
          change={12.5}
          changeLabel="vs last week"
          icon={Calendar}
          trend="up"
        />
        <StatCard
          title="Active Branches"
          value={analytics.kpis.activeBranches}
          icon={Building2}
          trend="neutral"
        />
        <StatCard
          title="Total Customers"
          value={analytics.kpis.uniqueCustomers}
          change={5.3}
          changeLabel="new this month"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Avg Revenue/Apt"
          value={`$${analytics.kpis.avgRevenuePerAppointment.toFixed(2)}`}
          change={-2.1}
          changeLabel="vs last month"
          icon={TrendingUp}
          trend="down"
        />
        <StatCard
          title="Staff Utilization"
          value={`${analytics.kpis.staffUtilization}%`}
          icon={Users}
          trend="neutral"
        />
      </div>

      {/* Branch Comparison */}
      {analytics.branchData.length > 0 && (
        <BranchComparisonTable branches={analytics.branchData} />
      )}

      {/* Three Column Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Services */}
        {analytics.topServices.length > 0 && (
          <TopServicesCard services={analytics.topServices} />
        )}

        {/* Staff Leaderboard */}
        {analytics.topStaff.length > 0 && (
          <StaffLeaderboard staff={analytics.topStaff} />
        )}

        {/* Customer Insights */}
        <CustomerInsights stats={analytics.customerStats} />
      </div>
    </div>
  );
};

export default BranchDashboard;
