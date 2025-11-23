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

export interface ScheduleConflict {
  day: string;
  branch_id: string;
  branch_name: string;
  conflicting_slots: {
    existing: TimeSlot;
    new: TimeSlot;
  }[];
}

/**
 * Converts time string (HH:MM) to minutes since midnight for easy comparison
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time slots overlap
 * Returns true if there's any overlap between slot1 and slot2
 */
export function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  // Two slots overlap if: (start1 < end2) AND (start2 < end1)
  return start1 < end2 && start2 < end1;
}

/**
 * Detects schedule conflicts for a staff member across different branches
 * @param newSchedule - The schedule being added/updated for the current branch
 * @param existingSchedules - Array of schedules from other branches
 * @param currentBranchId - The branch ID being edited (to exclude from conflict check)
 * @returns Array of conflicts found
 */
export function detectScheduleConflicts(
  newSchedule: WorkingHours,
  existingSchedules: Array<{
    branch_id: string;
    branch_name: string;
    working_hours: WorkingHours;
  }>,
  currentBranchId: string
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Days of the week to check
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  days.forEach((day) => {
    const newDaySchedule = newSchedule[day];
    
    // Skip if the new schedule has this day marked as closed or no slots
    if (!newDaySchedule || newDaySchedule.closed || !newDaySchedule.slots || newDaySchedule.slots.length === 0) {
      return;
    }

    // Check against each existing schedule from other branches
    existingSchedules.forEach((existing) => {
      // Skip if it's the same branch we're editing
      if (existing.branch_id === currentBranchId) {
        return;
      }

      const existingDaySchedule = existing.working_hours[day];
      
      // Skip if the existing schedule has this day closed or no slots
      if (!existingDaySchedule || existingDaySchedule.closed || !existingDaySchedule.slots || existingDaySchedule.slots.length === 0) {
        return;
      }

      // Check for overlaps between new slots and existing slots
      const conflictingSlots: { existing: TimeSlot; new: TimeSlot }[] = [];

      newDaySchedule.slots.forEach((newSlot) => {
        existingDaySchedule.slots.forEach((existingSlot) => {
          if (doSlotsOverlap(newSlot, existingSlot)) {
            conflictingSlots.push({
              existing: existingSlot,
              new: newSlot,
            });
          }
        });
      });

      // If we found conflicts for this day and branch, add to results
      if (conflictingSlots.length > 0) {
        conflicts.push({
          day,
          branch_id: existing.branch_id,
          branch_name: existing.branch_name,
          conflicting_slots: conflictingSlots,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Formats conflicts into a user-friendly message
 */
export function formatConflictMessage(conflicts: ScheduleConflict[]): string {
  if (conflicts.length === 0) return "";

  const messages = conflicts.map((conflict) => {
    const day = conflict.day.charAt(0).toUpperCase() + conflict.day.slice(1);
    const slots = conflict.conflicting_slots
      .map((slot) => `${slot.new.start}-${slot.new.end} conflicts with ${slot.existing.start}-${slot.existing.end}`)
      .join(", ");
    
    return `${day} at ${conflict.branch_name}: ${slots}`;
  });

  return messages.join("\n");
}

/**
 * Groups conflicts by day for easier display
 */
export function groupConflictsByDay(conflicts: ScheduleConflict[]): Record<string, ScheduleConflict[]> {
  return conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.day]) {
      acc[conflict.day] = [];
    }
    acc[conflict.day].push(conflict);
    return acc;
  }, {} as Record<string, ScheduleConflict[]>);
}
