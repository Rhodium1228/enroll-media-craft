import { TimeSlot } from "./dateAssignmentUtils";

/**
 * Calculate staff utilization metrics for a given date
 */

export interface StaffUtilizationMetrics {
  staffId: string;
  staffName: string;
  totalAvailableMinutes: number;
  totalBookedMinutes: number;
  utilizationPercentage: number;
  appointmentCount: number;
  status: "underbooked" | "optimal" | "overbooked";
}

export const calculateTimeSlotMinutes = (slots: TimeSlot[]): number => {
  return slots.reduce((total, slot) => {
    const [startHour, startMin] = slot.start.split(":").map(Number);
    const [endHour, endMin] = slot.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return total + (endMinutes - startMinutes);
  }, 0);
};

export const calculateStaffUtilization = (
  staffId: string,
  staffName: string,
  availableTimeSlots: TimeSlot[],
  appointments: Array<{ start_time: string; end_time: string }>
): StaffUtilizationMetrics => {
  const totalAvailableMinutes = calculateTimeSlotMinutes(availableTimeSlots);
  
  const totalBookedMinutes = appointments.reduce((total, apt) => {
    const [startHour, startMin] = apt.start_time.split(":").map(Number);
    const [endHour, endMin] = apt.end_time.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return total + (endMinutes - startMinutes);
  }, 0);

  const utilizationPercentage =
    totalAvailableMinutes > 0
      ? Math.round((totalBookedMinutes / totalAvailableMinutes) * 100)
      : 0;

  let status: "underbooked" | "optimal" | "overbooked" = "optimal";
  if (utilizationPercentage < 50) {
    status = "underbooked";
  } else if (utilizationPercentage > 90) {
    status = "overbooked";
  }

  return {
    staffId,
    staffName,
    totalAvailableMinutes,
    totalBookedMinutes,
    utilizationPercentage,
    appointmentCount: appointments.length,
    status,
  };
};

export const getUtilizationColor = (
  status: StaffUtilizationMetrics["status"]
): { bg: string; text: string; label: string } => {
  switch (status) {
    case "underbooked":
      return {
        bg: "bg-yellow-100 dark:bg-yellow-900",
        text: "text-yellow-700 dark:text-yellow-100",
        label: "Underbooked",
      };
    case "optimal":
      return {
        bg: "bg-green-100 dark:bg-green-900",
        text: "text-green-700 dark:text-green-100",
        label: "Optimal",
      };
    case "overbooked":
      return {
        bg: "bg-red-100 dark:bg-red-900",
        text: "text-red-700 dark:text-red-100",
        label: "Overbooked",
      };
  }
};

export const getUtilizationBarColor = (percentage: number): string => {
  if (percentage < 50) return "bg-yellow-500";
  if (percentage <= 90) return "bg-green-500";
  return "bg-red-500";
};
