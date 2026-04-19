CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `authenticator` (
	`credentialID` text NOT NULL,
	`userId` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`credentialPublicKey` text NOT NULL,
	`counter` integer NOT NULL,
	`credentialDeviceType` text NOT NULL,
	`credentialBackedUp` integer NOT NULL,
	`transports` text,
	PRIMARY KEY(`userId`, `credentialID`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authenticator_credentialID_unique` ON `authenticator` (`credentialID`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`current_version_id` text NOT NULL,
	FOREIGN KEY (`current_version_id`) REFERENCES `entry_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_deleted_at_idx` ON `entries` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `entries_current_version_id_idx` ON `entries` (`current_version_id`);--> statement-breakpoint
CREATE TABLE `entry_version_tags` (
	`version_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`version_id`, `tag_id`),
	FOREIGN KEY (`version_id`) REFERENCES `entry_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_version_tags_tag_id_idx` ON `entry_version_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `entry_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`entry_date` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`mood_score` integer,
	`energy_score` integer,
	`edited_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_versions_entry_id_idx` ON `entry_versions` (`entry_id`);--> statement-breakpoint
CREATE INDEX `entry_versions_entry_date_idx` ON `entry_versions` (`entry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `entry_version_unique` ON `entry_versions` (`entry_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `notifications_sent` (
	`subscription_id` text NOT NULL,
	`date` text NOT NULL,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`subscription_id`, `date`),
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`device_label` text DEFAULT 'Unknown device' NOT NULL,
	`user_agent` text,
	`timezone` text DEFAULT 'Europe/Budapest' NOT NULL,
	`notify_hour` integer DEFAULT 21 NOT NULL,
	`notify_minute` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `tags_usage_count_idx` ON `tags` (`usage_count`);