CREATE TABLE "saved_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_products_user_product_idx" ON "saved_products" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "saved_products_user_idx" ON "saved_products" USING btree ("user_id");