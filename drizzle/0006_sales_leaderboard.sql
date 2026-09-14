ALTER TABLE `inventory` ADD `status` text DEFAULT 'holding' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `sold_at` text;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `sold_price` real;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `sale_note` text;
--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_status` ON `inventory` (`owner_id`,`status`);
--> statement-breakpoint
CREATE TABLE `leaderboard_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`hide_portfolio_value` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
