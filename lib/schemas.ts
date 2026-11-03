import { z } from "zod";
import { MAX_CONTENT_LENGTH } from "@/lib/constants";

export { MAX_CONTENT_LENGTH };

export const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(MAX_CONTENT_LENGTH, `Content must be at most ${MAX_CONTENT_LENGTH} characters`);

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export const sendSchema = z.object({
  content: contentSchema,
});

export const replySchema = z.object({
  message_id: z.uuid(),
  content: contentSchema,
  status: z.enum(["done", "error"]).optional(),
});

export const messagesQuerySchema = z.object({
  since: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO timestamp")
    .optional(),
});

export const pendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
