import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  total_appointments: number;
  total_spent: number;
  last_visit: string;
}

interface BranchCustomersProps {
  branchId: string;
}

export default function BranchCustomers({ branchId }: BranchCustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();

    // Real-time subscription for appointment changes
    const channel = supabase
      .channel('branch-customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `branch_id=eq.${branchId}`
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch all appointments for this branch
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          customer_name,
          customer_email,
          customer_phone,
          date,
          service_id,
          services (cost)
        `)
        .eq("branch_id", branchId)
        .order("date", { ascending: false });

      if (error) throw error;

      // Aggregate customer data
      const customerMap = new Map<string, Customer>();

      appointments?.forEach((apt: any) => {
        const key = apt.customer_email || apt.customer_name;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer_name: apt.customer_name,
            customer_email: apt.customer_email,
            customer_phone: apt.customer_phone,
            total_appointments: 0,
            total_spent: 0,
            last_visit: apt.date,
          });
        }

        const customer = customerMap.get(key)!;
        customer.total_appointments += 1;
        customer.total_spent += apt.services?.cost || 0;
        
        if (apt.date > customer.last_visit) {
          customer.last_visit = apt.date;
        }
      });

      const customerList = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime());

      setCustomers(customerList);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No customers have booked at this branch yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:gap-6">
        {customers.map((customer, index) => (
          <Card key={index} className="hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{customer.customer_name}</CardTitle>
                  <CardDescription className="mt-2 space-y-1">
                    {customer.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{customer.customer_email}</span>
                      </div>
                    )}
                    {customer.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{customer.customer_phone}</span>
                      </div>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {customer.total_appointments} {customer.total_appointments === 1 ? 'Visit' : 'Visits'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="font-semibold">${customer.total_spent.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Visit</p>
                    <p className="font-semibold">
                      {new Date(customer.last_visit).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
