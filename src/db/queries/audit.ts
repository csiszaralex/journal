import { CATEGORIES } from '@/app/(app)/settings/audit-log/categories';
import { createId } from '@paralleldrive/cuid2';
import { and, count, desc, like, or } from 'drizzle-orm';
import { db } from '../client';
import { auditLog } from '../schema';

type Category = (typeof CATEGORIES)[number];
export type CategoryEvent = `${Category}.${string}`;

export function logAudit(event: CategoryEvent, metadata?: Record<string, unknown>): void {
  db.insert(auditLog)
    .values({
      id: createId(),
      event,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: Date.now(),
    })
    .run();
}

export interface AuditLogPage {
  items: (typeof auditLog.$inferSelect)[];
  total: number;
}

export function listAuditLogs({
  page,
  limit = 50,
  eventPrefix,
  search,
}: {
  page: number;
  limit?: number;
  eventPrefix?: string;
  search?: string;
}): AuditLogPage {
  const conditions = [];
  if (eventPrefix) conditions.push(like(auditLog.event, `${eventPrefix}.%`));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(like(auditLog.event, pattern), like(auditLog.metadata, pattern)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.created_at))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const row = db.select({ total: count() }).from(auditLog).where(where).get();

  return { items, total: row?.total ?? 0 };
}

