import { format, isWithinInterval, parseISO } from "date-fns";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  closed?: boolean;
  slots: TimeSlot[];
}

interface WorkingHours {
  [day: string]: DaySchedule;
}

interface ScheduleOverride {
  id: string;
  staff_id: string;
  branch_id: string;
  date: string;
  override_type: 'available' | 'unavailable' | 'custom_hours';
  time_slots: TimeSlot[];
  reason?: string;
}

interface LeaveRequest {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface DateScheduleConflict {
  date: string;
  branch_id: string;
  branch_name: string;
  conflicting_slots: {
    existing: TimeSlot;
    new: TimeSlot;
  }[];
}

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time slots overlap
 */
export function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  return start1 < end2 && start2 < end1;
}

/**
 * Gets the actual schedule for a specific date considering:
 * 1. Leave requests (highest priority - returns empty schedule)
 * 2. Date-specific overrides
 * 3. Recurring weekly pattern (fallback)
 */
export function getActualScheduleForDate(
  date: Date,
  recurringSchedule: WorkingHours,
  overrides: ScheduleOverride[],
  leaveRequests: LeaveRequest[]
): TimeSlot[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayName = format(date, 'EEEE').toLowerCase();

  // 1. Check if staff is on leave
  const isOnLeave = leaveRequests.some(leave => {
    if (leave.status !== 'approved') return false;
    const leaveStart = parseISO(leave.start_date);
    const leaveEnd = parseISO(leave.end_date);
    return isWithinInterval(date, { start: leaveStart, end: leaveEnd });
  });

  if (isOnLeave) {
    return []; // Staff is unavailable
  }

  // 2. Check for date-specific override
  const override = overrides.find(o => o.date === dateStr);
  if (override) {
    if (override.override_type === 'unavailable') {
      return [];
    }
    if (override.override_type === 'custom_hours') {
      return override.time_slots || [];
    }
  }

  // 3. Use recurring weekly pattern
  const daySchedule = recurringSchedule[dayName];
  if (!daySchedule || daySchedule.closed || !daySchedule.slots) {
    return [];
  }

  return daySchedule.slots;
}

/**
 * Detects conflicts for a specific date across branches
 */
export function detectDateScheduleConflicts(
  date: Date,
  newSchedule: {
    branch_id: string;
    branch_name: string;
    time_slots: TimeSlot[];
  },
  existingSchedules: Array<{
    branch_id: string;
    branch_name: string;
    staff_id: string;
    working_hours: WorkingHours;
    overrides: ScheduleOverride[];
    leave_requests: LeaveRequest[];
  }>,
  currentStaffId: string
): DateScheduleConflict[] {
  const conflicts: DateScheduleConflict[] = [];

  // Filter schedules for the specific staff member
  const staffSchedules = existingSchedules.filter(
    s => s.staff_id === currentStaffId && s.branch_id !== newSchedule.branch_id
  );

  staffSchedules.forEach(existing => {
    // Get actual schedule for this date
    const existingSlots = getActualScheduleForDate(
      date,
      existing.working_hours,
      existing.overrides,
      existing.leave_requests
    );

    if (existingSlots.length === 0) {
      return; // No schedule on this date
    }

    // Check for overlaps
    const conflictingSlots: { existing: TimeSlot; new: TimeSlot }[] = [];

    newSchedule.time_slots.forEach(newSlot => {
      existingSlots.forEach(existingSlot => {
        if (doSlotsOverlap(newSlot, existingSlot)) {
          conflictingSlots.push({
            existing: existingSlot,
            new: newSlot,
          });
        }
      });
    });

    if (conflictingSlots.length > 0) {
      conflicts.push({
        date: format(date, 'yyyy-MM-dd'),
        branch_id: existing.branch_id,
        branch_name: existing.branch_name,
        conflicting_slots: conflictingSlots,
      });
    }
  });

  return conflicts;
}

/**
 * Formats date-specific conflicts into a user-friendly message
 */
export function formatDateConflictMessage(conflicts: DateScheduleConflict[]): string {
  if (conflicts.length === 0) return "";

  const messages = conflicts.map(conflict => {
    const dateStr = format(parseISO(conflict.date), 'MMM dd, yyyy');
    const slots = conflict.conflicting_slots
      .map(slot => `${slot.new.start}-${slot.new.end} conflicts with ${slot.existing.start}-${slot.existing.end}`)
      .join(", ");
    
    return `${dateStr} at ${conflict.branch_name}: ${slots}`;
  });

  return messages.join("\n");
}
