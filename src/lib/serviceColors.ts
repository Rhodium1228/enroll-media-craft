/**
 * Service type color mappings for visual identification
 */

export const SERVICE_TYPE_COLORS = {
  haircut: {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-100",
    border: "border-blue-500",
    dot: "bg-blue-500",
  },
  coloring: {
    bg: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-700 dark:text-purple-100",
    border: "border-purple-500",
    dot: "bg-purple-500",
  },
  styling: {
    bg: "bg-pink-100 dark:bg-pink-900",
    text: "text-pink-700 dark:text-pink-100",
    border: "border-pink-500",
    dot: "bg-pink-500",
  },
  treatment: {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-100",
    border: "border-green-500",
    dot: "bg-green-500",
  },
  shave: {
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-700 dark:text-orange-100",
    border: "border-orange-500",
    dot: "bg-orange-500",
  },
  other: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-100",
    border: "border-gray-500",
    dot: "bg-gray-500",
  },
} as const;

export type ServiceType = keyof typeof SERVICE_TYPE_COLORS;

export const getServiceTypeColor = (serviceType: string | null | undefined) => {
  if (!serviceType) return SERVICE_TYPE_COLORS.other;
  
  const type = serviceType.toLowerCase() as ServiceType;
  return SERVICE_TYPE_COLORS[type] || SERVICE_TYPE_COLORS.other;
};

export const getServiceTypeBadgeClass = (serviceType: string | null | undefined) => {
  const colors = getServiceTypeColor(serviceType);
  return `${colors.bg} ${colors.text} ${colors.border} border`;
};

export const getServiceTypeDotClass = (serviceType: string | null | undefined) => {
  const colors = getServiceTypeColor(serviceType);
  return colors.dot;
};
