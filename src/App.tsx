import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import BranchDashboard from "./pages/BranchDashboard";
import BranchDetail from "./pages/BranchDetail";
import Branches from "./pages/Branches";
import Services from "./pages/Services";
import StaffManagement from "./pages/StaffManagement";
import StaffCalendar from "./pages/StaffCalendar";
import StaffCalendarPage from "./pages/StaffCalendarPage";
import Appointments from "./pages/Appointments";
import PublicBooking from "./pages/PublicBooking";
import ManageBooking from "./pages/ManageBooking";
import SubmitReview from "./pages/SubmitReview";
import CustomerPortal from "./pages/CustomerPortal";
import StaffClockRecords from "./pages/StaffClockRecords";
import StaffClockInOut from "./pages/StaffClockInOut";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><BranchDashboard /></AppLayout>} />
          <Route path="/book" element={<PublicBooking />} />
          <Route path="/manage-booking" element={<ManageBooking />} />
          <Route path="/submit-review" element={<SubmitReview />} />
          <Route path="/my-bookings" element={<CustomerPortal />} />
          <Route path="/branch/:branchId" element={<AppLayout><BranchDetail /></AppLayout>} />
          <Route path="/branches" element={<AppLayout><Branches /></AppLayout>} />
          <Route path="/services" element={<AppLayout><Services /></AppLayout>} />
          <Route path="/staff" element={<AppLayout><StaffManagement /></AppLayout>} />
          <Route path="/staff/:staffId/calendar" element={<AppLayout><StaffCalendarPage /></AppLayout>} />
          <Route path="/calendar" element={<AppLayout><StaffCalendar /></AppLayout>} />
          <Route path="/appointments" element={<AppLayout><Appointments /></AppLayout>} />
          <Route path="/clock-records" element={<AppLayout><StaffClockRecords /></AppLayout>} />
          <Route path="/clock-in-out" element={<AppLayout><StaffClockInOut /></AppLayout>} />
          <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
