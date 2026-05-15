CREATE TABLE `entry_qa_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_version_id` text NOT NULL,
	`position` integer NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_version_id`) REFERENCES `entry_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_qa_version_position` ON `entry_qa_pairs` (`entry_version_id`,`position`);