ALTER TABLE `entry_versions` ADD `kind` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `entry_versions` ADD `period_start` text;--> statement-breakpoint
CREATE INDEX `entry_versions_kind_idx` ON `entry_versions` (`kind`);