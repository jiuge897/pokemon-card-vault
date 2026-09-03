CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`item_type` text DEFAULT 'card' NOT NULL,
	`printing` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`market_price` real,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_owner_product_printing` ON `inventory` (`owner_id`,`product_id`,`printing`);
--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_id` ON `inventory` (`owner_id`);
