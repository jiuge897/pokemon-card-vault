CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`printing` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`market_price` real,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_product_printing` ON `inventory` (`product_id`,`printing`);