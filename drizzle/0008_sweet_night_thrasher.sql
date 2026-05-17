CREATE TABLE `intentions` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text,
	`text` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` integer,
	`completed_in_entry_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_in_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intentions_status_idx` ON `intentions` (`status`);--> statement-breakpoint
CREATE INDEX `intentions_due_date_idx` ON `intentions` (`due_date`);--> statement-breakpoint
CREATE INDEX `intentions_entry_id_idx` ON `intentions` (`entry_id`);