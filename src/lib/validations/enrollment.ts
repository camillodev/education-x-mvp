import { z } from 'zod';
import { EnrollmentPlanSchema } from '@/lib/validations/plan';

// Payload for creating a single enrollment (used by the CRUD POST route)
export const CreateEnrollmentSchema = z.object({
  guardianId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  plan: EnrollmentPlanSchema,
});

// Payload for updating an enrollment – allow partial updates of mutable fields
export const UpdateEnrollmentSchema = z.object({
  guardianId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  plan: EnrollmentPlanSchema.optional(),
  status: z.enum(['PENDING_CONFIRMATION', 'PENDING_SCHOOL_APPROVAL', 'CANCELLED', 'ACTIVE']).optional(),
  // other mutable fields could be added here
}).partial();
