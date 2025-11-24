import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCurrentPosition, validateGeofence } from "@/lib/geofencing";
import { format } from "date-fns";

interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
}

interface ActiveClockRecord {
  id: string;
  branch_id: string;
  clock_in_time: string;
  branches: {
    name: string;
  };
}

export default function StaffClockInOut() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [activeRecord, setActiveRecord] = useState<ActiveClockRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    fetchBranches();
    fetchActiveClockRecord();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get branches where staff is assigned
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!staffData) {
        toast.error('Staff profile not found');
        return;
      }

      const { data: assignments } = await supabase
        .from('staff_branches')
        .select('branch_id')
        .eq('staff_id', staffData.id);

      if (!assignments || assignments.length === 0) {
        toast.error('No branch assignments found');
        return;
      }

      const branchIds = assignments.map(a => a.branch_id);
      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('id, name, address, latitude, longitude, geofence_radius')
        .in('id', branchIds)
        .eq('status', 'active');

      if (error) throw error;
      setBranches(branchesData || []);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const fetchActiveClockRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!staffData) return;

      const { data, error } = await supabase
        .from('staff_clock_records')
        .select(`
          id,
          branch_id,
          clock_in_time,
          branches:branch_id (name)
        `)
        .eq('staff_id', staffData.id)
        .eq('status', 'clocked_in')
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setActiveRecord(data);
    } catch (error: any) {
      console.error('Error fetching active record:', error);
    }
  };

  const handleGetLocation = async () => {
    setGpsLoading(true);
    try {
      const location = await getCurrentPosition();
      setCurrentLocation(location);
      toast.success('Location acquired successfully');
    } catch (error: any) {
      toast.error(error.message);
      setCurrentLocation(null);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch');
      return;
    }

    if (!currentLocation) {
      toast.error('Please get your location first');
      return;
    }

    setLoading(true);
    try {
      const branch = branches.find(b => b.id === selectedBranch);
      if (!branch) throw new Error('Branch not found');

      // Validate geofencing
      if (branch.latitude && branch.longitude) {
        const validation = validateGeofence(
          currentLocation.latitude,
          currentLocation.longitude,
          branch.latitude,
          branch.longitude,
          branch.geofence_radius
        );

        if (!validation.isWithinGeofence) {
          toast.error(
            `You are ${validation.distance}m away from the branch. Must be within ${branch.geofence_radius}m to clock in.`,
            { duration: 5000 }
          );
          return;
        }
      } else {
        toast.error('Branch GPS coordinates not configured. Contact admin.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!staffData) throw new Error('Staff profile not found');

      const { error } = await supabase
        .from('staff_clock_records')
        .insert({
          staff_id: staffData.id,
          branch_id: selectedBranch,
          clock_in_latitude: currentLocation.latitude,
          clock_in_longitude: currentLocation.longitude,
          status: 'clocked_in',
        });

      if (error) throw error;

      toast.success('Clocked in successfully!');
      await fetchActiveClockRecord();
      setCurrentLocation(null);
      setSelectedBranch("");
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast.error(error.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeRecord) return;

    if (!currentLocation) {
      toast.error('Please get your location first');
      return;
    }

    setLoading(true);
    try {
      const branch = branches.find(b => b.id === activeRecord.branch_id);
      if (!branch) throw new Error('Branch not found');

      // Validate geofencing for clock out
      if (branch.latitude && branch.longitude) {
        const validation = validateGeofence(
          currentLocation.latitude,
          currentLocation.longitude,
          branch.latitude,
          branch.longitude,
          branch.geofence_radius
        );

        if (!validation.isWithinGeofence) {
          toast.error(
            `You are ${validation.distance}m away from the branch. Must be within ${branch.geofence_radius}m to clock out.`,
            { duration: 5000 }
          );
          return;
        }
      }

      const { error } = await supabase
        .from('staff_clock_records')
        .update({
          clock_out_time: new Date().toISOString(),
          clock_out_latitude: currentLocation.latitude,
          clock_out_longitude: currentLocation.longitude,
          status: 'clocked_out',
        })
        .eq('id', activeRecord.id);

      if (error) throw error;

      toast.success('Clocked out successfully!');
      await fetchActiveClockRecord();
      setCurrentLocation(null);
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const getDistanceInfo = () => {
    if (!currentLocation || !selectedBranch) return null;

    const branch = branches.find(b => b.id === selectedBranch);
    if (!branch || !branch.latitude || !branch.longitude) return null;

    const validation = validateGeofence(
      currentLocation.latitude,
      currentLocation.longitude,
      branch.latitude,
      branch.longitude,
      branch.geofence_radius
    );

    return validation;
  };

  const distanceInfo = getDistanceInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-8 rounded-xl shadow-xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Clock In / Clock Out</h1>
          </div>
          <p className="text-white/90">Record your work hours with GPS verification</p>
        </div>

        {/* Active Clock Record */}
        {activeRecord && (
          <Alert className="border-2 border-primary/50 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Currently clocked in at <strong>{activeRecord.branches.name}</strong> since{' '}
                {format(new Date(activeRecord.clock_in_time), 'HH:mm')}
              </span>
              <Badge>Active</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card className="hover:shadow-xl transition-all border-2">
          <CardHeader>
            <CardTitle>
              {activeRecord ? 'Clock Out' : 'Clock In'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Branch Selection */}
            {!activeRecord && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                        {(!branch.latitude || !branch.longitude) && (
                          <Badge variant="destructive" className="ml-2">No GPS</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* GPS Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">GPS Location</label>
                {currentLocation && (
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    Location Acquired
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleGetLocation}
                disabled={gpsLoading}
                variant="outline"
                className="w-full"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Get Current Location
                  </>
                )}
              </Button>

              {currentLocation && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Lat: {currentLocation.latitude.toFixed(6)}, 
                    Lng: {currentLocation.longitude.toFixed(6)}
                  </p>
                  {distanceInfo && (
                    <Alert variant={distanceInfo.isWithinGeofence ? "default" : "destructive"}>
                      {distanceInfo.isWithinGeofence ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Within geofence ({distanceInfo.distance}m from branch)
                          </AlertDescription>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            Outside geofence ({distanceInfo.distance}m from branch, must be within{' '}
                            {branches.find(b => b.id === selectedBranch)?.geofence_radius}m)
                          </AlertDescription>
                        </>
                      )}
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button
              onClick={activeRecord ? handleClockOut : handleClockIn}
              disabled={loading || !currentLocation || (!activeRecord && !selectedBranch)}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : activeRecord ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Clock Out
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Clock In
                </>
              )}
            </Button>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be within the branch's geofence radius to clock in or out.
                Make sure location services are enabled on your device.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}