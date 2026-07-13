import { z } from "zod";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";

export const trailingCommandSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  bloque: z.enum(BLOQUE_PRIORIDADES).optional(),
  confidence: z.number().min(0).max(1).optional(),
  targetDayOffset: z.enum(["yesterday", "today", "tomorrow"]).optional(),
  /** 0=domingo … 6=sábado (convención JS Date.getDay) */
  weekday: z.number().int().min(0).max(6).optional(),
  /** HH:mm en hora local */
  timeOfDay: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .optional(),
  injectCalendar: z.boolean().optional(),
});

export const trailingCommandsExtractionSchema = z.object({
  commands: z.array(trailingCommandSchema),
});

export type TrailingCommand = z.infer<typeof trailingCommandSchema>;
export type TrailingCommandsExtraction = z.infer<
  typeof trailingCommandsExtractionSchema
>;

export type TrailingCommandsResult = {
  tasksCreated: number;
  eventsCreated: number;
};
