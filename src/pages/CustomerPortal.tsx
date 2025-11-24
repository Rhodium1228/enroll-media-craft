import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, User, Star, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: appointments, refetch } = useQuery({
    queryKey: ["customer-appointments", email],
    queryFn: async () => {
      if (!email || !isAuthenticated) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          service:services(title, cost, duration),
          staff:staff(first_name, last_name),
          branch:branches(name, address)
        `)
        .eq("customer_email", email)
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated && !!email,
  });

  const handleLogin = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsAuthenticated(true);
    toast.success("Access granted! Loading your bookings...");
  };

  const handleSubmitReview = async () => {
    if (!selectedAppointment || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const appointment = appointments?.find(a => a.id === selectedAppointment);
    if (!appointment) return;

    const { error } = await supabase
      .from("service_reviews")
      .insert({
        service_id: appointment.service_id,
        appointment_id: appointment.id,
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        rating,
        comment: comment || null,
      });

    if (error) {
      toast.error("Failed to submit review");
      return;
    }

    toast.success("Thank you for your review!");
    setSelectedAppointment(null);
    setRating(0);
    setComment("");
    refetch();
  };

  const upcomingAppointments = appointments?.filter(
    (apt) => new Date(apt.date) >= new Date() && apt.status !== "cancelled"
  ) || [];

  const pastAppointments = appointments?.filter(
    (apt) => new Date(apt.date) < new Date() || apt.status === "completed"
  ) || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Customer Portal</CardTitle>
            <CardDescription>
              Enter your email to view your bookings and submit reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Access My Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">{email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIsAuthenticated(false);
            setEmail("");
          }}
        >
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({pastAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming appointments
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {appointment.service?.title}
                      </CardTitle>
                      <CardDescription>
                        Booking Reference: {appointment.booking_reference}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "scheduled"
                          ? "default"
                          : appointment.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(appointment.date), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {appointment.staff?.first_name} {appointment.staff?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{appointment.branch?.name}</span>
                  </div>
                  {appointment.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        Note: {appointment.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No past appointments
              </CardContent>
            </Card>
          ) : (
            pastAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {appointment.service?.title}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(appointment.date), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "completed"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {appointment.staff?.first_name} {appointment.staff?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{appointment.branch?.name}</span>
                  </div>
                  {appointment.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAppointment(appointment.id)}
                      className="mt-2"
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Leave a Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4 mt-6">
          {selectedAppointment && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Review</CardTitle>
                <CardDescription>
                  How was your experience with{" "}
                  {
                    appointments?.find((a) => a.id === selectedAppointment)
                      ?.service?.title
                  }
                  ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Share your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmitReview}>Submit Review</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAppointment(null);
                      setRating(0);
                      setComment("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Reviews</CardTitle>
              <CardDescription>
                Reviews you've submitted for past appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Review history coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
