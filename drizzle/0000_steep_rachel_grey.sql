CREATE TABLE `cg_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`date` text NOT NULL,
	`end_date` text NOT NULL,
	`time` text NOT NULL,
	`guests` integer NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `cg_venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_user` ON `cg_bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_availability` ON `cg_bookings` (`venue_id`,`date`,`status`);--> statement-breakpoint
CREATE TABLE `cg_favorites` (
	`user_id` text NOT NULL,
	`venue_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `venue_id`),
	FOREIGN KEY (`venue_id`) REFERENCES `cg_venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cg_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cg_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cg_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `cg_venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cg_reviews_booking_id_unique` ON `cg_reviews` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_venue` ON `cg_reviews` (`venue_id`);--> statement-breakpoint
CREATE TABLE `cg_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cg_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cg_venues` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`status` text NOT NULL,
	`city` text NOT NULL,
	`category` text NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_venues_owner` ON `cg_venues` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_venues_status_city` ON `cg_venues` (`status`,`city`);