DROP INDEX `emotions_usage_count_idx`;--> statement-breakpoint
ALTER TABLE `emotions` DROP COLUMN `usage_count`;--> statement-breakpoint
DROP INDEX `tags_usage_count_idx`;--> statement-breakpoint
ALTER TABLE `tags` DROP COLUMN `usage_count`;