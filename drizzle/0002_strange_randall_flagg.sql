CREATE TYPE "public"."establishment_media_type" AS ENUM('image', 'video');--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'draft' BEFORE 'pending';--> statement-breakpoint
CREATE TABLE "establishment_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"type" "establishment_media_type" NOT NULL,
	"url" varchar(500) NOT NULL,
	"public_id" varchar(255),
	"format" varchar(40),
	"bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "establishments" ADD COLUMN "business_permit_number" varchar(120);--> statement-breakpoint
ALTER TABLE "establishment_media" ADD CONSTRAINT "establishment_media_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "establishment_media_establishment_idx" ON "establishment_media" USING btree ("establishment_id");--> statement-breakpoint
CREATE INDEX "establishment_media_type_idx" ON "establishment_media" USING btree ("type");
