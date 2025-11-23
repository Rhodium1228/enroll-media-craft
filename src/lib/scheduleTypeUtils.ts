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
  date: string;
  override_type: 'available' | 'unavailable' | 'custom_hours';
  time_slots: any;
}

interface LeaveRequest {
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type ScheduleType = 'regular' | 'custom' | 'unavailable' | 'closed';

/**
 * Determines the schedule type for a specific date
 * Priority: Leave/Unavailable > Date Override > Recurring Pattern
 */
export function getScheduleType(
  date: Date,
  recurringSchedule: WorkingHours,
  overrides: ScheduleOverride[] = [],
  leaveRequests: LeaveRequest[] = []
): ScheduleType {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayName = format(date, 'EEEE').toLowerCase();

  // 1. Check if staff is on approved leave
  const isOnLeave = leaveRequests.some(leave => {
    if (leave.status !== 'approved') return false;
    const leaveStart = parseISO(leave.start_date);
    const leaveEnd = parseISO(leave.end_date);
    return isWithinInterval(date, { start: leaveStart, end: leaveEnd });
  });

  if (isOnLeave) {
    return 'unavailable';
  }

  // 2. Check for date-specific override
  const override = overrides.find(o => o.date === dateStr);
  if (override) {
    if (override.override_type === 'unavailable') {
      return 'unavailable';
    }
    if (override.override_type === 'custom_hours') {
      return 'custom';
    }
  }

  // 3. Use recurring weekly pattern
  const daySchedule = recurringSchedule[dayName];
  if (!daySchedule || daySchedule.closed || !daySchedule.slots || daySchedule.slots.length === 0) {
    return 'closed';
  }

  return 'regular';
}

/**
 * Gets the badge color class based on schedule type
 */
export function getScheduleTypeBadge(type: ScheduleType): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  className: string;
} {
  switch (type) {
    case 'regular':
      return {
        variant: 'default',
        label: 'Regular',
        className: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50',
      };
    case 'custom':
      return {
        variant: 'secondary',
        label: 'Custom',
        className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50',
      };
    case 'unavailable':
      return {
        variant: 'destructive',
        label: 'Unavailable',
        className: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50',
      };
    case 'closed':
      return {
        variant: 'outline',
        label: 'Closed',
        className: 'bg-muted/50 text-muted-foreground',
      };
    default:
      return {
        variant: 'outline',
        label: 'Unknown',
        className: '',
      };
  }
}

/**
 * Gets schedule type icon
 */
export function getScheduleTypeIcon(type: ScheduleType): string {
  switch (type) {
    case 'regular':
      return '🟢';
    case 'custom':
      return '🟡';
    case 'unavailable':
      return '🔴';
    case 'closed':
      return '⚪';
    default:
      return '';
  }
}
