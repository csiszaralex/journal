ALTER TABLE `intentions` ADD `category` text;--> statement-breakpoint
CREATE INDEX `intentions_category_idx` ON `intentions` (`category`);