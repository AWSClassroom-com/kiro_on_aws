import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import * as schema from "./schema.ts";
import { foodItems } from "./schema.ts";

type Db = PgliteDatabase<typeof schema>;

const seedData = [
	{
		name: "Organic Bananas",
		description: "Fresh organic bananas from local farm",
		category: "Fruits",
		quantity: 6,
		unit: "pieces",
		calories: 105,
		protein: "1.30",
		carbs: "27.00",
		fat: "0.40",
		expirationDate: new Date("2025-01-15"),
	},
	{
		name: "Greek Yogurt",
		description: "Plain Greek yogurt, high in protein",
		category: "Dairy",
		quantity: 1,
		unit: "container",
		calories: 130,
		protein: "20.00",
		carbs: "9.00",
		fat: "0.00",
		expirationDate: new Date("2025-01-10"),
	},
	{
		name: "Whole Wheat Bread",
		description: "Artisan whole wheat sourdough bread",
		category: "Grains",
		quantity: 1,
		unit: "loaf",
		calories: 80,
		protein: "4.00",
		carbs: "15.00",
		fat: "1.00",
		expirationDate: new Date("2025-01-08"),
	},
	{
		name: "Chicken Breast",
		description: "Boneless, skinless chicken breast",
		category: "Protein",
		quantity: 2,
		unit: "lbs",
		calories: 165,
		protein: "31.00",
		carbs: "0.00",
		fat: "3.60",
		expirationDate: new Date("2025-01-05"),
	},
	{
		name: "Baby Spinach",
		description: "Fresh baby spinach leaves",
		category: "Vegetables",
		quantity: 1,
		unit: "bag",
		calories: 7,
		protein: "0.90",
		carbs: "1.10",
		fat: "0.10",
		expirationDate: new Date("2025-01-07"),
	},
	{
		name: "Almonds",
		description: "Raw unsalted almonds",
		category: "Nuts",
		quantity: 1,
		unit: "bag",
		calories: 164,
		protein: "6.00",
		carbs: "6.10",
		fat: "14.20",
		expirationDate: new Date("2025-06-01"),
	},
	{
		name: "Olive Oil",
		description: "Extra virgin olive oil",
		category: "Oils",
		quantity: 1,
		unit: "bottle",
		calories: 884,
		protein: "0.00",
		carbs: "0.00",
		fat: "100.00",
		expirationDate: new Date("2026-01-01"),
	},
	{
		name: "Brown Rice",
		description: "Long grain brown rice",
		category: "Grains",
		quantity: 2,
		unit: "lbs",
		calories: 216,
		protein: "5.00",
		carbs: "45.00",
		fat: "1.80",
		expirationDate: new Date("2025-12-01"),
	},
	{
		name: "Cheddar Cheese",
		description: "Sharp cheddar cheese block",
		category: "Dairy",
		quantity: 1,
		unit: "block",
		calories: 113,
		protein: "7.00",
		carbs: "1.00",
		fat: "9.00",
		expirationDate: new Date("2025-02-15"),
	},
	{
		name: "Avocados",
		description: "Ripe Hass avocados",
		category: "Fruits",
		quantity: 3,
		unit: "pieces",
		calories: 234,
		protein: "2.90",
		carbs: "12.00",
		fat: "21.00",
		expirationDate: new Date("2025-01-06"),
	},
];

export async function runSeedIfEmpty(db: Db) {
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(foodItems);
	if (count > 0) return;

	console.log("🌱 Seeding empty database with sample food items...");
	await db.insert(foodItems).values(seedData);
	console.log(`✅ Inserted ${seedData.length} food items`);
}

export async function reseed(db: Db) {
	console.log("🌱 Reseeding database...");
	await db.delete(foodItems);
	await db.insert(foodItems).values(seedData);
	console.log(`✅ Inserted ${seedData.length} food items`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
	const { db } = await import("./index.ts");
	await reseed(db);
	process.exit(0);
}
