ALTER TABLE `entry_versions` ADD `client_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `entry_versions_client_id_unique` ON `entry_versions` (`client_id`);