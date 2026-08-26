import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
  uniqueIndex,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    created_at: integer("created_at").notNull(),
    deleted_at: integer("deleted_at"),
    current_version_id: text("current_version_id")
      .notNull()
      .references((): AnySQLiteColumn => entryVersions.id),
  },
  (t) => [
    index("entries_deleted_at_idx").on(t.deleted_at),
    index("entries_current_version_id_idx").on(t.current_version_id),
  ]
);

export const entryVersions = sqliteTable(
  "entry_versions",
  {
    id: text("id").primaryKey(),
    entry_id: text("entry_id")
      .notNull()
      .references((): AnySQLiteColumn => entries.id),
    version_number: integer("version_number").notNull(),
    entry_date: text("entry_date").notNull(),
    text: text("text").notNull().default(""),
    mood_score: integer("mood_score"),
    energy_score: integer("energy_score"),
    edited_at: integer("edited_at").notNull(),
    client_id: text("client_id").unique(),
    // 'daily' = one calendar day (entry_date). 'summary' = a range recap:
    // period_start .. entry_date, written after a break in journaling.
    kind: text("kind").notNull().default("daily"),
    period_start: text("period_start"),
  },
  (t) => [
    unique("entry_version_unique").on(t.entry_id, t.version_number),
    index("entry_versions_entry_id_idx").on(t.entry_id),
    index("entry_versions_entry_date_idx").on(t.entry_date),
    index("entry_versions_kind_idx").on(t.kind),
  ]
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").unique().notNull(),
    display_name: text("display_name").notNull(),
    color: text("color").notNull().default("#9ca3af"),
    created_at: integer("created_at").notNull(),
  },
  (t) => [index("tags_name_idx").on(t.name)]
);

export const entryVersionTags = sqliteTable(
  "entry_version_tags",
  {
    version_id: text("version_id")
      .notNull()
      .references(() => entryVersions.id),
    tag_id: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (t) => [
    primaryKey({ columns: [t.version_id, t.tag_id] }),
    index("entry_version_tags_tag_id_idx").on(t.tag_id),
  ]
);

export const emotions = sqliteTable(
  "emotions",
  {
    id: text("id").primaryKey(),
    name: text("name").unique().notNull(),
    display_name: text("display_name").notNull(),
    color: text("color").notNull().default("#9ca3af"),
    emoji: text("emoji"),
    created_at: integer("created_at").notNull(),
  },
  (t) => [index("emotions_name_idx").on(t.name)]
);

export const entryVersionEmotions = sqliteTable(
  "entry_version_emotions",
  {
    version_id: text("version_id")
      .notNull()
      .references(() => entryVersions.id),
    emotion_id: text("emotion_id")
      .notNull()
      .references(() => emotions.id),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.version_id, t.emotion_id] }),
    index("entry_version_emotions_emotion_id_idx").on(t.emotion_id),
  ]
);

export const entryQaPairs = sqliteTable(
  "entry_qa_pairs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entry_version_id: text("entry_version_id")
      .notNull()
      .references(() => entryVersions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    created_at: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uniq_qa_version_position").on(
      t.entry_version_id,
      t.position
    ),
  ]
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").unique().notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  device_label: text("device_label").notNull().default("Unknown device"),
  user_agent: text("user_agent"),
  timezone: text("timezone").notNull().default("Europe/Budapest"),
  notify_hour: integer("notify_hour").notNull().default(21),
  notify_minute: integer("notify_minute").notNull().default(0),
  enabled: integer("enabled").notNull().default(1),
  created_at: integer("created_at").notNull(),
  last_seen_at: integer("last_seen_at").notNull(),
});

export const notificationsSent = sqliteTable(
  "notifications_sent",
  {
    subscription_id: text("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id),
    date: text("date").notNull(),
    sent_at: integer("sent_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.subscription_id, t.date] })]
);

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  ip: text("ip"),
  user_agent: text("user_agent"),
  metadata: text("metadata"),
  created_at: integer("created_at").notNull(),
});

export const entryTemplates = sqliteTable("entry_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  text: text("text").notNull().default(""),
  default_mood: integer("default_mood"),
  default_energy: integer("default_energy"),
  created_at: integer("created_at").notNull(),
});

export const intentions = sqliteTable(
  "intentions",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    category: text("category"),
    due_date: text("due_date"),
    status: text("status").notNull().default("open"),
    completed_at: integer("completed_at"),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  },
  (t) => [
    index("intentions_status_idx").on(t.status),
    index("intentions_due_date_idx").on(t.due_date),
    index("intentions_category_idx").on(t.category),
  ]
);

export const intentionCategoryColors = sqliteTable(
  "intention_category_colors",
  {
    name: text("name").primaryKey(),
    color: text("color").notNull(),
  }
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const userProfileQa = sqliteTable("user_profile_qa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  position: integer("position").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  created_at: integer("created_at").notNull(),
});

// Auth.js tables — generated by @auth/drizzle-adapter, declared here for Drizzle Kit awareness
export const authUsers = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const authAccounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const authSessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  name: text("name"),
  userAgent: text("userAgent"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }),
});

export const authVerificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const authAuthenticators = sqliteTable(
  "authenticator",
  {
    credentialID: text("credentialID").unique().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: integer("credentialBackedUp", {
      mode: "boolean",
    }).notNull(),
    transports: text("transports"),
    name: text("name"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.credentialID] })]
);
