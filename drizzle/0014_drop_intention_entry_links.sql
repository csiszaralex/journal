PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_intentions` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`category` text,
	`due_date` text,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_intentions`("id", "text", "category", "due_date", "status", "completed_at", "created_at", "updated_at") SELECT "id", "text", "category", "due_date", "status", "completed_at", "created_at", "updated_at" FROM `intentions`;--> statement-breakpoint
DROP TABLE `intentions`;--> statement-breakpoint
ALTER TABLE `__new_intentions` RENAME TO `intentions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `intentions_status_idx` ON `intentions` (`status`);--> statement-breakpoint
CREATE INDEX `intentions_due_date_idx` ON `intentions` (`due_date`);--> statement-breakpoint
CREATE INDEX `intentions_category_idx` ON `intentions` (`category`);