import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface StaffDateAssignment {
  id: string;
  staff_id: string;
  branch_id: string;
  date: string;
  time_slots: TimeSlot[];
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DateAssignmentConflict {
  staff_id: string;
  staff_name: string;
  date: string;
  conflicting_branch_id: string;
  conflicting_branch_name: string;
  proposed_hours: TimeSlot;
  existing_hours: TimeSlot;
  overlap_minutes: number;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time slots overlap
 */
export function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  return start1 < end2 && start2 < end1;
}

/**
 * Calculate overlap duration in minutes
 */
export function calculateOverlapMinutes(slot1: TimeSlot, slot2: TimeSlot): number {
  if (!doSlotsOverlap(slot1, slot2)) return 0;

  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return overlapEnd - overlapStart;
}

/**
 * Detect conflicts for a staff member on a specific date across branches
 */
export function detectDateAssignmentConflicts(
  staffId: string,
  staffName: string,
  date: string,
  proposedTimeSlots: TimeSlot[],
  existingAssignments: Array<{
    branch_id: string;
    branch_name: string;
    time_slots: TimeSlot[];
  }>,
  currentBranchId: string
): DateAssignmentConflict[] {
  const conflicts: DateAssignmentConflict[] = [];

  // Check each proposed time slot against existing assignments
  for (const proposedSlot of proposedTimeSlots) {
    for (const assignment of existingAssignments) {
      // Skip checking against the same branch
      if (assignment.branch_id === currentBranchId) continue;

      for (const existingSlot of assignment.time_slots) {
        if (doSlotsOverlap(proposedSlot, existingSlot)) {
          conflicts.push({
            staff_id: staffId,
            staff_name: staffName,
            date,
            conflicting_branch_id: assignment.branch_id,
            conflicting_branch_name: assignment.branch_name,
            proposed_hours: proposedSlot,
            existing_hours: existingSlot,
            overlap_minutes: calculateOverlapMinutes(proposedSlot, existingSlot),
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Format conflict message for display
 */
export function formatConflictMessage(conflicts: DateAssignmentConflict[]): string {
  if (conflicts.length === 0) return "";

  const messages = conflicts.map((conflict) => {
    const overlapHours = Math.floor(conflict.overlap_minutes / 60);
    const overlapMins = conflict.overlap_minutes % 60;
    const overlapDuration = overlapHours > 0 
      ? `${overlapHours}h ${overlapMins}m` 
      : `${overlapMins}m`;

    return `${conflict.staff_name} is already scheduled at ${conflict.conflicting_branch_name} on ${format(parseISO(conflict.date), 'MMM d, yyyy')} from ${conflict.existing_hours.start} to ${conflict.existing_hours.end}. Conflict duration: ${overlapDuration}`;
  });

  return messages.join('\n');
}

/**
 * Check if a date is within a leave request period
 */
export function isDateInLeaveRequest(
  date: string,
  leaveRequests: Array<{ start_date: string; end_date: string; status: string }>
): boolean {
  const checkDate = startOfDay(parseISO(date));

  return leaveRequests.some((leave) => {
    if (leave.status !== 'approved') return false;
    
    const start = startOfDay(parseISO(leave.start_date));
    const end = endOfDay(parseISO(leave.end_date));

    return isWithinInterval(checkDate, { start, end });
  });
}

/**
 * Group assignments by date
 */
export function groupAssignmentsByDate(
  assignments: StaffDateAssignment[]
): Record<string, StaffDateAssignment[]> {
  return assignments.reduce((acc, assignment) => {
    if (!acc[assignment.date]) {
      acc[assignment.date] = [];
    }
    acc[assignment.date].push(assignment);
    return acc;
  }, {} as Record<string, StaffDateAssignment[]>);
}

/**
 * Get count of staff assigned to a date
 */
export function getDateStaffCount(
  date: string,
  assignments: StaffDateAssignment[]
): number {
  return assignments.filter((a) => a.date === date).length;
}

/**
 * Check if time slots fit within branch operating hours for a specific date
 */
export function validateAgainstBranchHours(
  timeSlots: TimeSlot[],
  branchOpenHours: TimeSlot[],
  branchIsClosed: boolean
): { valid: boolean; message?: string } {
  if (branchIsClosed) {
    return {
      valid: false,
      message: "Branch is closed on this date",
    };
  }

  if (!branchOpenHours || branchOpenHours.length === 0) {
    return {
      valid: false,
      message: "Branch operating hours not defined for this date",
    };
  }

  for (const slot of timeSlots) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    // Check if slot fits within any of the branch's open hours
    const fitsWithinBranchHours = branchOpenHours.some((branchSlot) => {
      const branchStart = timeToMinutes(branchSlot.start);
      const branchEnd = timeToMinutes(branchSlot.end);

      return slotStart >= branchStart && slotEnd <= branchEnd;
    });

    if (!fitsWithinBranchHours) {
      return {
        valid: false,
        message: `Staff hours ${slot.start}-${slot.end} exceed branch operating hours`,
      };
    }
  }

  return { valid: true };
}
