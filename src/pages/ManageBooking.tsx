import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Search, Loader2, MapPin, Clock, User, Calendar, XCircle } from "lucide-react";
import { getAppointmentStatusColor, formatTimeRange } from "@/lib/appointmentUtils";

type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface BookingDetails {
  id: string;
  booking_reference: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  service: {
    title: string;
    duration: number;
    cost: number;
  };
  branch: {
    name: string;
    address: string;
    phone: string;
  };
  staff: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
  };
}

export default function ManageBooking() {
  const { toast } = useToast();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleSearch = async () => {
    if (!reference || !email) {
      toast({
        title: "Missing Information",
        description: "Please enter both booking reference and email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-booking', {
        body: {
          method: 'GET',
          reference,
          email,
        },
      });

      if (error) throw error;

      if (!data?.booking) {
        toast({
          title: "Booking Not Found",
          description: "No booking found with this reference and email",
          variant: "destructive",
        });
        return;
      }

      setBooking(data.booking);
    } catch (error: any) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('manage-booking', {
        body: {
          method: 'DELETE',
          reference: booking.booking_reference,
          email: booking.customer_email,
        },
      });

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your appointment has been cancelled successfully",
      });

      setBooking(null);
      setReference("");
      setEmail("");
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowCancelDialog(false);
    }
  };

  const canModify = booking && 
    booking.status !== 'completed' && 
    booking.status !== 'cancelled' &&
    new Date(booking.date) >= new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Manage Your Booking</h1>
          <p className="text-muted-foreground">
            Enter your booking reference and email to view or modify your appointment
          </p>
        </div>

        {!booking ? (
          <Card>
            <CardHeader>
              <CardTitle>Find Your Booking</CardTitle>
              <CardDescription>
                You received a booking reference via email when you made your appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Booking Reference</Label>
                <Input
                  id="reference"
                  placeholder="ABC12345"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="font-mono text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSearch}
                disabled={loading || !reference || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Booking
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Booking Details</CardTitle>
                    <CardDescription className="mt-1">
                      Reference: <span className="font-mono font-bold">{booking.booking_reference}</span>
                    </CardDescription>
                  </div>
                  <Badge className={getAppointmentStatusColor(booking.status)}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{booking.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{booking.customer_email}</span>
                    </div>
                    {booking.customer_phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{booking.customer_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Appointment Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Appointment Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium">{booking.service.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{format(parseISO(booking.date), "PPP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {formatTimeRange(booking.start_time, booking.end_time)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{booking.service.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-medium">${booking.service.cost}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Staff Info */}
                <div>
                  <h3 className="font-semibold mb-3">Stylist</h3>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={booking.staff.profile_image_url || undefined} />
                      <AvatarFallback>
                        {booking.staff.first_name[0]}
                        {booking.staff.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {booking.staff.first_name} {booking.staff.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Your stylist</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Location Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{booking.branch.name}</p>
                    <p className="text-muted-foreground">{booking.branch.address}</p>
                    <p className="text-muted-foreground">{booking.branch.phone}</p>
                  </div>
                </div>

                {booking.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Additional Notes</h3>
                      <p className="text-sm text-muted-foreground">{booking.notes}</p>
                    </div>
                  </>
                )}

                {/* Actions */}
                {canModify && (
                  <div className="pt-4 space-y-2">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setBooking(null);
                        setReference("");
                        setEmail("");
                      }}
                    >
                      Search Another Booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} disabled={loading}>
                {loading ? "Cancelling..." : "Cancel Appointment"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
