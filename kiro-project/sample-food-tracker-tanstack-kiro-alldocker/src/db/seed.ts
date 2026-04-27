import { config } from "dotenv";
import { db } from "./index.js";
import { foodItems } from "./schema.js";

config();

const seedData = [
	{
		name: "Organic Bananas",
		description: "Fresh organic bananas from local farm",
		category: "Fruits",
		quantity: 6,
		unit: "pieces",
		calories: 105,
		protein: 1.3,
		carbs: 27.0,
		fat: 0.4,
		expirationDate: new Date("2025-01-15"),
	},
	{
		name: "Greek Yogurt",
		description: "Plain Greek yogurt, high in protein",
		category: "Dairy",
		quantity: 1,
		unit: "container",
		calories: 130,
		protein: 20.0,
		carbs: 9.0,
		fat: 0.0,
		expirationDate: new Date("2025-01-10"),
	},
	{
		name: "Whole Wheat Bread",
		description: "Artisan whole wheat sourdough bread",
		category: "Grains",
		quantity: 1,
		unit: "loaf",
		calories: 80,
		protein: 4.0,
		carbs: 15.0,
		fat: 1.0,
		expirationDate: new Date("2025-01-08"),
	},
	{
		name: "Chicken Breast",
		description: "Boneless, skinless chicken breast",
		category: "Protein",
		quantity: 2,
		unit: "lbs",
		calories: 165,
		protein: 31.0,
		carbs: 0.0,
		fat: 3.6,
		expirationDate: new Date("2025-01-05"),
	},
	{
		name: "Baby Spinach",
		description: "Fresh baby spinach leaves",
		category: "Vegetables",
		quantity: 1,
		unit: "bag",
		calories: 7,
		protein: 0.9,
		carbs: 1.1,
		fat: 0.1,
		expirationDate: new Date("2025-01-07"),
	},
	{
		name: "Almonds",
		description: "Raw unsalted almonds",
		category: "Nuts",
		quantity: 1,
		unit: "bag",
		calories: 164,
		protein: 6.0,
		carbs: 6.1,
		fat: 14.2,
		expirationDate: new Date("2025-06-01"),
	},
	{
		name: "Olive Oil",
		description: "Extra virgin olive oil",
		category: "Oils",
		quantity: 1,
		unit: "bottle",
		calories: 884,
		protein: 0.0,
		carbs: 0.0,
		fat: 100.0,
		expirationDate: new Date("2026-01-01"),
	},
	{
		name: "Brown Rice",
		description: "Long grain brown rice",
		category: "Grains",
		quantity: 2,
		unit: "lbs",
		calories: 216,
		protein: 5.0,
		carbs: 45.0,
		fat: 1.8,
		expirationDate: new Date("2025-12-01"),
	},
	{
		name: "Cheddar Cheese",
		description: "Sharp cheddar cheese block",
		category: "Dairy",
		quantity: 1,
		unit: "block",
		calories: 113,
		protein: 7.0,
		carbs: 1.0,
		fat: 9.0,
		expirationDate: new Date("2025-02-15"),
	},
	{
		name: "Avocados",
		description: "Ripe Hass avocados",
		category: "Fruits",
		quantity: 3,
		unit: "pieces",
		calories: 234,
		protein: 2.9,
		carbs: 12.0,
		fat: 21.0,
		expirationDate: new Date("2025-01-06"),
	},
];

async function seed() {
	try {
		console.log("🌱 Seeding database...");

		// Clear existing data
		await db.delete(foodItems);
		console.log("🗑️  Cleared existing food items");

		// Insert seed data
		await db.insert(foodItems).values(seedData);
		console.log(`✅ Inserted ${seedData.length} food items`);

		console.log("🎉 Seeding completed successfully!");
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

seed();
