CREATE TABLE `user_profile_qa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`position` integer NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`created_at` integer NOT NULL
);
