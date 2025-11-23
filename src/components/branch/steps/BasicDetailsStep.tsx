import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OpeningHoursEditor } from "../OpeningHoursEditor";

interface BasicDetailsStepProps {
  data: {
    name: string;
    address: string;
    timezone: string;
    phone: string;
    email: string;
    appointment_padding: number;
    open_hours: Record<string, { open: string; close: string }>;
  };
  updateData: (data: any) => void;
}

export const BasicDetailsStep = ({ data, updateData }: BasicDetailsStepProps) => {
  const [duplicateCheck, setDuplicateCheck] = useState<{
    loading: boolean;
    exists: boolean;
  }>({ loading: false, exists: false });

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  useEffect(() => {
    const checkDuplicate = async () => {
      if (!data.name || data.name.length < 3) {
        setDuplicateCheck({ loading: false, exists: false });
        return;
      }

      setDuplicateCheck({ loading: true, exists: false });

      const { data: existingBranches, error } = await supabase
        .from("branches")
        .select("id")
        .ilike("name", data.name)
        .limit(1);

      if (!error && existingBranches && existingBranches.length > 0) {
        setDuplicateCheck({ loading: false, exists: true });
      } else {
        setDuplicateCheck({ loading: false, exists: false });
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [data.name]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Basic Branch Information</h3>
        <p className="text-muted-foreground mb-6">
          Enter the essential details for the new branch location
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Branch Name *</Label>
          <Input
            id="name"
            placeholder="Downtown Branch"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            required
          />
          {duplicateCheck.exists && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>A branch with this name already exists</span>
              <Badge variant="outline" className="ml-auto">
                Warning
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Textarea
            id="address"
            placeholder="123 Main Street, City, State, ZIP"
            value={data.address}
            onChange={(e) => updateData({ address: e.target.value })}
            required
            rows={3}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={data.phone}
              onChange={(e) => updateData({ phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="branch@company.com"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={data.timezone}
              onValueChange={(value) => updateData({ timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="padding">Appointment Padding (minutes)</Label>
            <Input
              id="padding"
              type="number"
              min="0"
              max="60"
              value={data.appointment_padding}
              onChange={(e) =>
                updateData({ appointment_padding: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <OpeningHoursEditor
          value={data.open_hours}
          onChange={(hours) => updateData({ open_hours: hours })}
        />
      </div>
    </div>
  );
};
