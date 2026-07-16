import "server-only";

import { logActivity } from "@/lib/historial/log";
import { reschedulePendingTask } from "@/lib/pendientes/store";
import { rescheduleEvent } from "@/lib/events/service";

export async function rescheduleTask(taskId: string, targetDay: Date) {
  const task = await reschedulePendingTask(taskId, targetDay);
  void logActivity({
    category: "ludus",
    action: "rescheduled_task",
    title: "Tarea reprogramada",
    summary: task?.title ?? null,
    agentId: "orquestador-temporal",
    sourceType: "pending_task",
    sourceRef: taskId,
    metadata: { targetDay: targetDay.toISOString() },
  });
  return task;
}

export async function rescheduleTemporalEvent(eventId: string, occurredAt: Date) {
  const event = await rescheduleEvent(eventId, occurredAt);
  void logActivity({
    category: "events",
    action: "rescheduled_event",
    title: "Evento reprogramado",
    summary: event?.content ?? null,
    agentId: "orquestador-temporal",
    sourceType: "context_event",
    sourceRef: eventId,
    metadata: { occurredAt: occurredAt.toISOString() },
  });
  return event;
}
