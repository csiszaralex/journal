CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
INSERT INTO `app_settings` (`key`, `value`) VALUES ('registration_enabled', 'true');
