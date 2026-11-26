import { z } from 'zod';

export const RegisterSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number in E.164 format')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  referralCode: z.string().trim().max(32).optional(),
  recaptchaToken: z.string().trim().optional(),
});

export const LoginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export const PhoneOtpRequestSchema = z.object({
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
});

export const PhoneOtpVerifySchema = z.object({
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
  otp: z.string().trim().length(6),
  fullName: z.string().trim().min(2).max(120).optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(16),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export const ItineraryItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  time: z.string().trim().min(1).max(60),
  venue: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
});

export const StudioCustomizationSchema = z.object({
  serviceId: z.string().uuid(),
  templateId: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  celebrationTitle: z.string().trim().min(2).max(160),
  honoreeNames: z.string().trim().min(1).max(200),
  eventDate: z.string().trim().min(4).max(40),
  eventTime: z.string().trim().max(40).optional(),
  venueName: z.string().trim().max(200).optional(),
  venueAddress: z.string().trim().max(400).optional(),
  mapsUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().trim().max(3000).optional(),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#C5A15A'),
  animationStyle: z.enum(['elegant-fade', 'royal-curtain', 'floral-drift', 'sparkle-reveal']).default('elegant-fade'),
  musicTrackId: z.string().max(80).optional(),
  countdownEnabled: z.boolean().default(true),
  galleryEnabled: z.boolean().default(true),
  rsvpEnabled: z.boolean().default(true),
  wishesEnabled: z.boolean().default(true),
  itinerary: z.array(ItineraryItemSchema).max(20).default([]),
  photoAssetIds: z.array(z.string().uuid()).max(40).default([]),
  videoAssetIds: z.array(z.string().uuid()).max(5).default([]),
  customNotes: z.string().trim().max(2000).optional(),
});

export const CreateOrderSchema = z.object({
  serviceId: z.string().uuid(),
  templateId: z.string().uuid(),
  packageId: z.string().uuid(),
  selectedAddOnIds: z.array(z.string()).max(20).default([]),
  couponCode: z.string().trim().max(40).optional(),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().toLowerCase(),
  customerPhone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
  customization: StudioCustomizationSchema,
  requirementsText: z.string().trim().max(3000).optional(),
});

export const CreateRevisionSchema = z.object({
  section: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(2000),
  referenceAssetIds: z.array(z.string().uuid()).max(10).default([]),
});

export const PublicRsvpSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().max(24).optional(),
  guestEmail: z.string().trim().email().optional().or(z.literal('')),
  attending: z.enum(['YES', 'NO', 'MAYBE']),
  attendeeCount: z.number().int().min(1).max(20).default(1),
  message: z.string().trim().max(500).optional(),
});

export const PublicWishSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  relationship: z.string().trim().max(60).optional(),
  message: z.string().trim().min(2).max(600),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type StudioCustomizationInput = z.infer<typeof StudioCustomizationSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateRevisionInput = z.infer<typeof CreateRevisionSchema>;
export type PublicRsvpInput = z.infer<typeof PublicRsvpSchema>;
export type PublicWishInput = z.infer<typeof PublicWishSchema>;
