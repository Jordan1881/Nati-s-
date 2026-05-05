CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit_label" text,
	"price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"item_name_snap" text NOT NULL,
	"unit_label_snap" text,
	"price_snap" numeric(10, 2) NOT NULL,
	"category_snap" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"daily_number" integer NOT NULL,
	"order_date" date NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"pickup_time" text,
	"status" text,
	"payment_method" text,
	"payment_status" text,
	"notes" text,
	"total_price" numeric(10, 2) NOT NULL,
	"kitchen_printed_at" timestamp with time zone,
	"customer_printed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_menu_items_category" ON "menu_items" USING btree ("category","display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_lines_order" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_lines_item" ON "order_lines" USING btree ("menu_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_date_number_unique" ON "orders" USING btree ("order_date","daily_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_date" ON "orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_phone" ON "orders" USING btree ("customer_phone");