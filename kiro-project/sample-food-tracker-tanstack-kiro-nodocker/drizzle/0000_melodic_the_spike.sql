CREATE TABLE "food_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"quantity" integer DEFAULT 1,
	"unit" varchar(50) DEFAULT 'piece',
	"calories" integer,
	"protein" numeric(5, 2),
	"carbs" numeric(5, 2),
	"fat" numeric(5, 2),
	"expiration_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
