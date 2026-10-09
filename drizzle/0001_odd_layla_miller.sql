ALTER TABLE `cg_feedback` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `cg_feedback` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_feedback_user` ON `cg_feedback` (`user_id`);--> statement-breakpoint
ALTER TABLE `cg_reviews` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `cg_reviews` ADD `version` integer DEFAULT 1 NOT NULL;