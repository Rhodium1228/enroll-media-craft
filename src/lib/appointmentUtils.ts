import { format, parse, addMinutes } from "date-fns";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface Appointment {
  id: string;
  staff_id: string;
  branch_id: string;
  service_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  service?: {
    id: string;
    title: string;
    duration: number;
    cost: number;
  };
  branch?: {
    id: string;
    name: string;
  };
}

/**
 * Convert time string (HH:MM:SS or HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculate end time based on start time and duration in minutes
 */
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
};

/**
 * Check if two time slots overlap
 */
export const doSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  return start1 < end2 && start2 < end1;
};

/**
 * Validate if appointment fits within staff's assigned time slots for that date
 */
export const validateAppointmentSlot = (
  appointmentStart: string,
  appointmentEnd: string,
  staffTimeSlots: TimeSlot[]
): boolean => {
  const appointmentSlot = { start: appointmentStart, end: appointmentEnd };
  
  // Check if appointment fits within any of the staff's time slots
  return staffTimeSlots.some(staffSlot => {
    const appointmentStartMin = timeToMinutes(appointmentStart);
    const appointmentEndMin = timeToMinutes(appointmentEnd);
    const staffStartMin = timeToMinutes(staffSlot.start);
    const staffEndMin = timeToMinutes(staffSlot.end);
    
    return appointmentStartMin >= staffStartMin && appointmentEndMin <= staffEndMin;
  });
};

/**
 * Detect appointment conflicts with existing appointments for the same staff
 */
export const detectAppointmentConflicts = (
  newAppointment: { start_time: string; end_time: string },
  existingAppointments: Appointment[]
): Appointment[] => {
  const newSlot = {
    start: newAppointment.start_time,
    end: newAppointment.end_time,
  };

  return existingAppointments.filter(existing => {
    const existingSlot = {
      start: existing.start_time,
      end: existing.end_time,
    };
    return doSlotsOverlap(newSlot, existingSlot);
  });
};

/**
 * Generate available time slots based on staff schedule and existing appointments
 */
export const getAvailableSlots = (
  staffTimeSlots: TimeSlot[],
  existingAppointments: Appointment[],
  serviceDuration: number,
  slotInterval: number = 15 // Default 15-minute intervals
): TimeSlot[] => {
  const availableSlots: TimeSlot[] = [];

  staffTimeSlots.forEach(staffSlot => {
    const startMinutes = timeToMinutes(staffSlot.start);
    const endMinutes = timeToMinutes(staffSlot.end);

    // Generate slots at specified intervals
    for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += slotInterval) {
      const slotStart = minutesToTime(minutes);
      const slotEnd = minutesToTime(minutes + serviceDuration);
      
      const proposedSlot = { start: slotStart, end: slotEnd };
      
      // Check if this slot conflicts with any existing appointment
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentSlot = {
          start: appointment.start_time,
          end: appointment.end_time,
        };
        return doSlotsOverlap(proposedSlot, appointmentSlot);
      });

      if (!hasConflict) {
        availableSlots.push(proposedSlot);
      }
    }
  });

  return availableSlots;
};

/**
 * Group appointments by staff for timeline rendering
 */
export const groupAppointmentsByStaff = (
  appointments: AppointmentWithDetails[]
): Record<string, AppointmentWithDetails[]> => {
  return appointments.reduce((acc, appointment) => {
    const staffId = appointment.staff_id;
    if (!acc[staffId]) {
      acc[staffId] = [];
    }
    acc[staffId].push(appointment);
    return acc;
  }, {} as Record<string, AppointmentWithDetails[]>);
};

/**
 * Get color for appointment based on status
 */
export const getAppointmentStatusColor = (status: Appointment['status']): string => {
  const colors = {
    scheduled: 'bg-primary/20 border-primary',
    in_progress: 'bg-accent/20 border-accent',
    completed: 'bg-green-500/20 border-green-500',
    cancelled: 'bg-destructive/20 border-destructive',
    no_show: 'bg-muted border-muted-foreground',
  };
  return colors[status] || colors.scheduled;
};

/**
 * Get color for staff member (cycling through hues)
 */
export const getStaffColor = (staffId: string): string => {
  const hash = staffId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Format time range for display
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

/**
 * Convert minutes to pixels for timeline rendering
 */
export const minutesToPixels = (minutes: number, pixelsPerHour: number = 80): number => {
  return (minutes / 60) * pixelsPerHour;
};
