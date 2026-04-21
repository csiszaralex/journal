CREATE TABLE `entry_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`default_mood` integer,
	`default_energy` integer,
	`created_at` integer NOT NULL
);
