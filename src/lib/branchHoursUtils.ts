import { format } from "date-fns";

interface TimeSlot {
  open: string;
  close: string;
}

interface WorkingHours {
  [day: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

interface BranchScheduleOverride {
  date: string;
  override_type: string;
  time_slots: TimeSlot[];
}

/**
 * Get branch operating hours for a specific date
 * Priority: Date Override > Regular Weekly Schedule
 */
export function getBranchHoursForDate(
  date: Date,
  regularHours: WorkingHours,
  overrides: BranchScheduleOverride[]
): { open: string; close: string; closed: boolean } | null {
  const dateStr = format(date, "yyyy-MM-dd");
  
  // Check for date-specific override first
  const override = overrides.find((o) => o.date === dateStr);
  if (override) {
    if (override.override_type === "closed") {
      return { open: "", close: "", closed: true };
    }
    if (override.override_type === "custom_hours" && override.time_slots.length > 0) {
      // For simplicity, return the earliest open and latest close time
      const opens = override.time_slots.map(s => s.open).sort();
      const closes = override.time_slots.map(s => s.close).sort();
      return {
        open: opens[0],
        close: closes[closes.length - 1],
        closed: false,
      };
    }
  }

  // Fall back to regular weekly schedule
  const dayName = format(date, "EEEE");
  const dayHours = regularHours[dayName];
  
  if (!dayHours || dayHours.closed) {
    return { open: "", close: "", closed: true };
  }

  return {
    open: dayHours.open,
    close: dayHours.close,
    closed: false,
  };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if staff working hours fit within branch operating hours
 */
export function validateStaffAgainstBranchHours(
  date: Date,
  staffSlots: TimeSlot[],
  branchRegularHours: WorkingHours,
  branchOverrides: BranchScheduleOverride[]
): string | null {
  const branchHours = getBranchHoursForDate(date, branchRegularHours, branchOverrides);

  if (!branchHours) {
    return null;
  }

  // Branch is closed
  if (branchHours.closed) {
    return "Branch is closed on this date";
  }

  const branchStart = timeToMinutes(branchHours.open);
  const branchEnd = timeToMinutes(branchHours.close);

  // Check if staff hours fit within branch hours
  for (const slot of staffSlots) {
    const staffStart = timeToMinutes(slot.open);
    const staffEnd = timeToMinutes(slot.close);

    // Staff starts before branch opens
    if (staffStart < branchStart) {
      return `Staff scheduled before branch opens (Branch: ${branchHours.open} - ${branchHours.close}, Staff: ${slot.open} - ${slot.close})`;
    }

    // Staff ends after branch closes
    if (staffEnd > branchEnd) {
      return `Staff scheduled after branch closes (Branch: ${branchHours.open} - ${branchHours.close}, Staff: ${slot.open} - ${slot.close})`;
    }
  }

  return null;
}