import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { auditLog } from "../schema";

export function logAudit(
  event: string,
  metadata?: Record<string, unknown>
): void {
  db.insert(auditLog)
    .values({
      id: createId(),
      event,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: Date.now(),
    })
    .run();
}
