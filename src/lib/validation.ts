import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200).optional(),
  contentJson: z.unknown().optional(),
});

export const shareDocumentSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  permission: z.enum(["VIEW", "EDIT"]),
});
