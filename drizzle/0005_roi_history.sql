ALTER TABLE `inventory` ADD `created_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `roi_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`inventory_id` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	`quantity` integer NOT NULL,
	`market_price` real,
	`unit_cost` real,
	`taxable` integer DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`cash_rate` real NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roi_history_owner_inventory_date` ON `roi_history` (`owner_id`,`inventory_id`,`snapshot_date`);
--> statement-breakpoint
CREATE INDEX `idx_roi_history_owner_date` ON `roi_history` (`owner_id`,`snapshot_date`);
