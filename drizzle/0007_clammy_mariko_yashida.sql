CREATE TABLE `emotions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`color` text DEFAULT '#9ca3af' NOT NULL,
	`created_at` integer NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `emotions_name_unique` ON `emotions` (`name`);--> statement-breakpoint
CREATE INDEX `emotions_name_idx` ON `emotions` (`name`);--> statement-breakpoint
CREATE INDEX `emotions_usage_count_idx` ON `emotions` (`usage_count`);--> statement-breakpoint
CREATE TABLE `entry_version_emotions` (
	`version_id` text NOT NULL,
	`emotion_id` text NOT NULL,
	PRIMARY KEY(`version_id`, `emotion_id`),
	FOREIGN KEY (`version_id`) REFERENCES `entry_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`emotion_id`) REFERENCES `emotions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_version_emotions_emotion_id_idx` ON `entry_version_emotions` (`emotion_id`);--> statement-breakpoint
ALTER TABLE `tags` ADD `color` text DEFAULT '#9ca3af' NOT NULL;