import {
	decimal,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const foodItems = pgTable("food_items", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	category: varchar("category", { length: 100 }),
	quantity: integer("quantity").default(1),
	unit: varchar("unit", { length: 50 }).default("piece"),
	calories: integer("calories"),
	protein: decimal("protein", { precision: 5, scale: 2 }),
	carbs: decimal("carbs", { precision: 5, scale: 2 }),
	fat: decimal("fat", { precision: 5, scale: 2 }),
	expirationDate: timestamp("expiration_date"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const insertFoodItemSchema = createInsertSchema(foodItems, {
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	description: z.string().optional(),
	category: z.string().max(100, "Category too long").optional(),
	quantity: z.number().int().positive("Quantity must be positive").optional(),
	unit: z.string().max(50, "Unit too long").optional(),
	calories: z
		.number()
		.int()
		.nonnegative("Calories cannot be negative")
		.optional(),
	protein: z.number().nonnegative("Protein cannot be negative").optional(),
	carbs: z.number().nonnegative("Carbs cannot be negative").optional(),
	fat: z.number().nonnegative("Fat cannot be negative").optional(),
	expirationDate: z.date().optional(),
});

export const selectFoodItemSchema = createSelectSchema(foodItems);

export type FoodItem = typeof foodItems.$inferSelect;
export type NewFoodItem = typeof foodItems.$inferInsert;
