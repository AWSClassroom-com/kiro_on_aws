import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

const daysFromNow = (days: number) => {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString();
};

type SeedItem = Omit<
	Schema["FoodItem"]["createType"],
	"id" | "createdAt" | "updatedAt"
>;

const seedData: SeedItem[] = [
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
		expirationDate: daysFromNow(5),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(7),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(4),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(2),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(3),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(180),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(365),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(180),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(30),
		addedAt: daysFromNow(0),
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
		expirationDate: daysFromNow(3),
		addedAt: daysFromNow(0),
	},
	{
		name: "Strawberries",
		description: "Fresh strawberries",
		category: "Fruits",
		quantity: 1,
		unit: "container",
		calories: 32,
		protein: 0.7,
		carbs: 7.7,
		fat: 0.3,
		expirationDate: daysFromNow(2),
		addedAt: daysFromNow(-6),
	},
	{
		name: "Blueberries",
		description: "Wild blueberries",
		category: "Fruits",
		quantity: 1,
		unit: "pint",
		calories: 57,
		protein: 0.7,
		carbs: 14.5,
		fat: 0.3,
		expirationDate: daysFromNow(3),
		addedAt: daysFromNow(-5),
	},
	{
		name: "Kale",
		description: "Organic curly kale",
		category: "Vegetables",
		quantity: 1,
		unit: "bunch",
		calories: 33,
		protein: 2.9,
		carbs: 6.7,
		fat: 0.6,
		expirationDate: daysFromNow(4),
		addedAt: daysFromNow(-4),
	},
	{
		name: "Bell Peppers",
		description: "Mixed red and yellow bell peppers",
		category: "Vegetables",
		quantity: 3,
		unit: "pieces",
		calories: 31,
		protein: 1.0,
		carbs: 6.0,
		fat: 0.3,
		expirationDate: daysFromNow(5),
		addedAt: daysFromNow(-3),
	},
	{
		name: "Salmon Fillet",
		description: "Fresh Atlantic salmon",
		category: "Protein",
		quantity: 1,
		unit: "lb",
		calories: 208,
		protein: 22.0,
		carbs: 0.0,
		fat: 13.0,
		expirationDate: daysFromNow(1),
		addedAt: daysFromNow(-2),
	},
	{
		name: "Ground Turkey",
		description: "Lean ground turkey",
		category: "Protein",
		quantity: 1,
		unit: "lb",
		calories: 170,
		protein: 22.0,
		carbs: 0.0,
		fat: 9.0,
		expirationDate: daysFromNow(2),
		addedAt: daysFromNow(-1),
	},
	{
		name: "Whole Milk",
		description: "Organic whole milk",
		category: "Dairy",
		quantity: 1,
		unit: "gallon",
		calories: 149,
		protein: 7.7,
		carbs: 11.7,
		fat: 8.0,
		expirationDate: daysFromNow(6),
		addedAt: daysFromNow(-3),
	},
	{
		name: "Eggs",
		description: "Free-range large eggs",
		category: "Protein",
		quantity: 12,
		unit: "pieces",
		calories: 72,
		protein: 6.3,
		carbs: 0.4,
		fat: 4.8,
		expirationDate: daysFromNow(7),
		addedAt: daysFromNow(-5),
	},
	{
		name: "Sourdough Bread",
		description: "Fresh-baked sourdough loaf",
		category: "Grains",
		quantity: 1,
		unit: "loaf",
		calories: 188,
		protein: 7.7,
		carbs: 36.5,
		fat: 1.2,
		expirationDate: daysFromNow(4),
		addedAt: daysFromNow(-2),
	},
	{
		name: "Cherry Tomatoes",
		description: "Vine-ripened cherry tomatoes",
		category: "Vegetables",
		quantity: 1,
		unit: "pint",
		calories: 27,
		protein: 1.3,
		carbs: 5.8,
		fat: 0.3,
		expirationDate: daysFromNow(3),
		addedAt: daysFromNow(-4),
	},
	{
		name: "Cucumber",
		description: "English cucumber",
		category: "Vegetables",
		quantity: 2,
		unit: "pieces",
		calories: 16,
		protein: 0.7,
		carbs: 3.6,
		fat: 0.1,
		expirationDate: daysFromNow(5),
		addedAt: daysFromNow(-6),
	},
	{
		name: "Hummus",
		description: "Roasted red pepper hummus",
		category: "Snacks",
		quantity: 1,
		unit: "container",
		calories: 166,
		protein: 7.9,
		carbs: 14.3,
		fat: 9.6,
		expirationDate: daysFromNow(7),
		addedAt: daysFromNow(-1),
	},
	{
		name: "Carrots",
		description: "Organic baby carrots",
		category: "Vegetables",
		quantity: 1,
		unit: "bag",
		calories: 41,
		protein: 0.9,
		carbs: 9.6,
		fat: 0.2,
		expirationDate: daysFromNow(6),
		addedAt: daysFromNow(-7),
	},
	{
		name: "Apples",
		description: "Honeycrisp apples",
		category: "Fruits",
		quantity: 5,
		unit: "pieces",
		calories: 95,
		protein: 0.5,
		carbs: 25.0,
		fat: 0.3,
		expirationDate: daysFromNow(7),
		addedAt: daysFromNow(-3),
	},
	{
		name: "Mozzarella",
		description: "Fresh mozzarella ball",
		category: "Dairy",
		quantity: 1,
		unit: "ball",
		calories: 85,
		protein: 6.3,
		carbs: 0.6,
		fat: 6.3,
		expirationDate: daysFromNow(3),
		addedAt: daysFromNow(-2),
	},
	{
		name: "Pasta",
		description: "Whole wheat penne pasta",
		category: "Grains",
		quantity: 1,
		unit: "box",
		calories: 174,
		protein: 7.5,
		carbs: 37.0,
		fat: 0.8,
		expirationDate: daysFromNow(180),
		addedAt: daysFromNow(-5),
	},
	{
		name: "Tofu",
		description: "Extra firm organic tofu",
		category: "Protein",
		quantity: 1,
		unit: "block",
		calories: 144,
		protein: 17.0,
		carbs: 2.8,
		fat: 8.7,
		expirationDate: daysFromNow(5),
		addedAt: daysFromNow(0),
	},
	{
		name: "Lemons",
		description: "Fresh Meyer lemons",
		category: "Fruits",
		quantity: 4,
		unit: "pieces",
		calories: 17,
		protein: 0.6,
		carbs: 5.4,
		fat: 0.2,
		expirationDate: daysFromNow(6),
		addedAt: daysFromNow(-4),
	},
	{
		name: "Mushrooms",
		description: "Sliced cremini mushrooms",
		category: "Vegetables",
		quantity: 1,
		unit: "container",
		calories: 22,
		protein: 3.1,
		carbs: 3.3,
		fat: 0.3,
		expirationDate: daysFromNow(2),
		addedAt: daysFromNow(-2),
	},
	{
		name: "Orange Juice",
		description: "Fresh-squeezed orange juice",
		category: "Beverages",
		quantity: 1,
		unit: "carton",
		calories: 112,
		protein: 1.7,
		carbs: 25.8,
		fat: 0.5,
		expirationDate: daysFromNow(4),
		addedAt: daysFromNow(-1),
	},
];

async function clearExisting() {
	let cleared = 0;
	let nextToken: string | null | undefined = undefined;

	do {
		const page = await client.models.FoodItem.list({ nextToken });
		if (page.errors?.length) {
			throw new Error(
				`List failed: ${page.errors.map((e) => e.message).join(", ")}`,
			);
		}
		for (const item of page.data) {
			const result = await client.models.FoodItem.delete({ id: item.id });
			if (result.errors?.length) {
				console.error(
					`Failed to delete ${item.id}:`,
					result.errors.map((e) => e.message).join(", "),
				);
			} else {
				cleared++;
			}
		}
		nextToken = page.nextToken;
	} while (nextToken);

	return cleared;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createWithRetry(item: SeedItem, maxAttempts = 4) {
	let lastErrorMessages = "";
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const result = await client.models.FoodItem.create(item);
		if (!result.errors?.length) return { ok: true as const };

		lastErrorMessages = result.errors.map((e) => e.message).join(", ");
		const isTransientSchema = result.errors.some((e) =>
			/FieldUndefined|Validation error of type/i.test(e.message),
		);
		if (!isTransientSchema || attempt === maxAttempts) {
			return { ok: false as const, error: lastErrorMessages };
		}
		await sleep(1000 * attempt);
	}
	return { ok: false as const, error: lastErrorMessages };
}

async function seed() {
	console.log("Seeding FoodItem table...");

	const cleared = await clearExisting();
	console.log(`  Cleared ${cleared} existing items`);

	let inserted = 0;
	for (const item of seedData) {
		const result = await createWithRetry(item);
		if (result.ok) {
			inserted++;
		} else {
			console.error(`  Failed to insert "${item.name}": ${result.error}`);
		}
	}
	console.log(`  Inserted ${inserted}/${seedData.length} items`);
	console.log("Done.");
}

seed()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exit(1);
	})
	.then(() => process.exit(0));
