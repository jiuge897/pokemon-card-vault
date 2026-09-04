CREATE TABLE `inventory_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`product_id` integer,
	`source_id` text,
	`source_url` text,
	`name` text NOT NULL,
	`item_type` text DEFAULT 'card' NOT NULL,
	`printing` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`market_price` real,
	`updated_at` text
);
--> statement-breakpoint
INSERT INTO `inventory_new` (`id`,`owner_id`,`product_id`,`name`,`item_type`,`printing`,`quantity`,`market_price`,`updated_at`) SELECT `id`,`owner_id`,`product_id`,`name`,`item_type`,`printing`,`quantity`,`market_price`,`updated_at` FROM `inventory`;
--> statement-breakpoint
DROP TABLE `inventory`;
--> statement-breakpoint
ALTER TABLE `inventory_new` RENAME TO `inventory`;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_owner_product_printing` ON `inventory` (`owner_id`,`product_id`,`printing`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_owner_source_item_type` ON `inventory` (`owner_id`,`source_id`,`item_type`);
--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_id` ON `inventory` (`owner_id`);
