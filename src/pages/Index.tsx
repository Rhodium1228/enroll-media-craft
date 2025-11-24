import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BranchEnrolmentWizard } from "@/components/branch/BranchEnrolmentWizard";
import { AuthForm } from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, LayoutDashboard, Calendar, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/bms-pro-logo.png";

const Index = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm />
        <div className="fixed bottom-4 right-4">
          <Button
            size="lg"
            onClick={() => navigate("/book")}
            className="shadow-lg"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Appointment
          </Button>
        </div>
      </>
    );
  }

  if (showWizard) {
    return <BranchEnrolmentWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
      
      <div className="bg-gradient-to-r from-primary via-primary/90 to-accent py-8 sm:py-12 lg:py-16 px-4 sm:px-6">
        <div className="container mx-auto text-center space-y-4 sm:space-y-6 max-w-4xl">
          <div className="inline-block">
            <img 
              src={logo} 
              alt="BMS PRO" 
              className="h-20 sm:h-24 lg:h-32 w-auto mx-auto"
            />
          </div>
          
          <div className="space-y-2 sm:space-y-4">
            <p className="text-sm sm:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto px-4">
              Professional Branch Management System with comprehensive enrolment capabilities
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        <div className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto">

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="gap-2 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 w-full sm:w-auto"
            >
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">View My Branches</span>
            </Button>
            <Button 
              size="lg" 
              onClick={() => navigate("/appointments")}
              variant="outline"
              className="gap-2 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 w-full sm:w-auto"
            >
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Assign Tasks</span>
            </Button>
            <Button 
              size="lg" 
              onClick={() => navigate("/calendar")}
              variant="outline"
              className="gap-2 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 w-full sm:w-auto"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Staff Calendar</span>
            </Button>
            <Button 
              size="lg" 
              onClick={() => setShowWizard(true)}
              className="gap-2 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Enrol New Branch</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
            <div className="bg-card rounded-lg p-4 sm:p-6 border shadow-sm hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-primary">Step 1: Basic Details</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Enter branch information including name, address, timezone, and operating hours
              </p>
            </div>
            <div className="bg-card rounded-lg p-4 sm:p-6 border shadow-sm hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-primary">Step 2: Media Upload</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Upload branch logo, hero images, gallery photos, and compliance documents
              </p>
            </div>
            <div className="bg-card rounded-lg p-4 sm:p-6 border shadow-sm hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-primary/20 sm:col-span-2 lg:col-span-1">
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-primary">Step 3: Review & Submit</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Review all information and submit for processing with instant cloud storage
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
