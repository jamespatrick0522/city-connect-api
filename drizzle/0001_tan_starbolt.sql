CREATE TYPE "public"."voice_call_status" AS ENUM('ringing', 'accepted', 'rejected', 'missed', 'ended');--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"guest_full_name" varchar(120) NOT NULL,
	"guest_email" varchar(255),
	"guest_phone" varchar(30),
	"status" "voice_call_status" DEFAULT 'ringing' NOT NULL,
	"provider" varchar(40) DEFAULT 'agora' NOT NULL,
	"channel_name" varchar(120) NOT NULL,
	"tourist_uid" varchar(120) NOT NULL,
	"establishment_uid" varchar(120) NOT NULL,
	"accepted_by_user_id" uuid,
	"rejected_by_user_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_calls_establishment_idx" ON "voice_calls" USING btree ("establishment_id");--> statement-breakpoint
CREATE INDEX "voice_calls_status_idx" ON "voice_calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voice_calls_created_idx" ON "voice_calls" USING btree ("created_at");