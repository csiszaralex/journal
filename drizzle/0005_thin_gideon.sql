ALTER TABLE `authenticator` ADD `name` text;--> statement-breakpoint
ALTER TABLE `authenticator` ADD `createdAt` integer;--> statement-breakpoint
ALTER TABLE `session` ADD `name` text;--> statement-breakpoint
ALTER TABLE `session` ADD `userAgent` text;--> statement-breakpoint
ALTER TABLE `session` ADD `createdAt` integer;