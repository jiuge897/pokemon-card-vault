ALTER TABLE `inventory` ADD `unit_cost` real;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `taxable` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `tax_rate` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `cost_source` text DEFAULT 'purchase' NOT NULL;
