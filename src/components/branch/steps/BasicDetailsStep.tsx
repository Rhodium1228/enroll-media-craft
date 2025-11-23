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
import { AlertCircle, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OpeningHoursEditor } from "../OpeningHoursEditor";
import { basicDetailsSchema } from "@/lib/validation/branchSchema";
import { z } from "zod";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

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

  const validateField = (field: keyof typeof data, value: any) => {
    try {
      const fieldSchema = basicDetailsSchema.shape[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationErrors((prev) => ({
          ...prev,
          [field]: error.errors[0].message,
        }));
      }
    }
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        updateData({ address: place.formatted_address });
        validateField("address", place.formatted_address);
      }
    }
  };

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

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
            onChange={(e) => {
              updateData({ name: e.target.value });
              validateField("name", e.target.value);
            }}
            onBlur={(e) => validateField("name", e.target.value)}
            required
          />
          {validationErrors.name && (
            <p className="text-sm text-destructive">{validationErrors.name}</p>
          )}
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
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address *
            {loadError && (
              <span className="text-xs text-muted-foreground">(Maps unavailable)</span>
            )}
          </Label>
          {isLoaded && !loadError ? (
            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
              <Textarea
                id="address"
                placeholder="Start typing address..."
                value={data.address}
                onChange={(e) => {
                  updateData({ address: e.target.value });
                  validateField("address", e.target.value);
                }}
                onBlur={(e) => validateField("address", e.target.value)}
                required
                rows={3}
              />
            </Autocomplete>
          ) : (
            <div className="relative">
              <Textarea
                id="address"
                placeholder="123 Main Street, City, State, ZIP"
                value={data.address}
                onChange={(e) => {
                  updateData({ address: e.target.value });
                  validateField("address", e.target.value);
                }}
                onBlur={(e) => validateField("address", e.target.value)}
                required
                rows={3}
              />
              {!isLoaded && !loadError && (
                <div className="absolute top-2 right-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          {validationErrors.address && (
            <p className="text-sm text-destructive">{validationErrors.address}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890 (E.164 format)"
              value={data.phone}
              onChange={(e) => {
                updateData({ phone: e.target.value });
                validateField("phone", e.target.value);
              }}
              onBlur={(e) => validateField("phone", e.target.value)}
              required
            />
            {validationErrors.phone && (
              <p className="text-sm text-destructive">{validationErrors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="branch@company.com"
              value={data.email}
              onChange={(e) => {
                updateData({ email: e.target.value.toLowerCase() });
                validateField("email", e.target.value.toLowerCase());
              }}
              onBlur={(e) => validateField("email", e.target.value.toLowerCase())}
              required
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
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
