import { z } from "zod";

// Step 1: Basic Details Validation
export const basicDetailsSchema = z.object({
  name: z
    .string()
    .min(3, "Branch name must be at least 3 characters")
    .max(100, "Branch name must be less than 100 characters")
    .trim(),
  address: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must be less than 500 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (use E.164 format: +1234567890)")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .trim()
    .toLowerCase(),
  timezone: z.string().min(1, "Timezone is required"),
  appointment_padding: z
    .number()
    .min(0, "Padding must be at least 0 minutes")
    .max(60, "Padding must be less than 60 minutes"),
  open_hours: z.record(
    z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean().optional(),
    })
  ),
});

// Step 2: Media Upload Validation
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_HERO_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_GALLERY_SIZE = 4 * 1024 * 1024; // 4MB per image
const MAX_COMPLIANCE_SIZE = 10 * 1024 * 1024; // 10MB per doc

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

export const validateLogo = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Logo must be JPG, PNG, or WEBP";
  }
  if (file.size > MAX_LOGO_SIZE) {
    return `Logo must be less than ${MAX_LOGO_SIZE / 1024 / 1024}MB`;
  }
  return null;
};

export const validateHero = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Hero image must be JPG, PNG, or WEBP";
  }
  if (file.size > MAX_HERO_SIZE) {
    return `Hero image must be less than ${MAX_HERO_SIZE / 1024 / 1024}MB`;
  }
  return null;
};

export const validateGalleryImage = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Gallery images must be JPG, PNG, or WEBP";
  }
  if (file.size > MAX_GALLERY_SIZE) {
    return `Gallery images must be less than ${MAX_GALLERY_SIZE / 1024 / 1024}MB`;
  }
  return null;
};

export const validateComplianceDoc = (file: File): string | null => {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return "Compliance documents must be PDF, JPG, or PNG";
  }
  if (file.size > MAX_COMPLIANCE_SIZE) {
    return `Compliance documents must be less than ${MAX_COMPLIANCE_SIZE / 1024 / 1024}MB`;
  }
  return null;
};

export type BasicDetailsData = z.infer<typeof basicDetailsSchema>;
