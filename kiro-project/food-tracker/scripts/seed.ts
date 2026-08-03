/**
 * Seeds the FoodItem table with 30 sample entries.
 *
 * Run with the Amplify sandbox up (so amplify_outputs.json exists):
 *   npm run seed
 *
 * Safe to re-run — if the table already has items, seeding is skipped.
 * Dates are generated relative to "now" so recently-added and
 * expiring-soon items are always present, whenever you run it.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const outputsPath = fileURLToPath(new URL("../amplify_outputs.json", import.meta.url));

if (!existsSync(outputsPath)) {
  console.error(
    "amplify_outputs.json not found.\n" +
      "Start the sandbox first (npm run amplify:sandbox) and wait for the deploy to finish, then re-run npm run seed.",
  );
  process.exit(1);
}

Amplify.configure(JSON.parse(readFileSync(outputsPath, "utf-8")));
const client = generateClient<Schema>();

/** ISO datetime `days` from now (negative = in the past). */
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type SeedItem = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Days until expiration (negative = expired, null = shelf-stable). */
  expiresInDays: number | null;
  /** Days since the item was added. */
  addedDaysAgo: number;
};

const SEED_ITEMS: SeedItem[] = [
  {
    name: "Chicken Breast",
    category: "Protein",
    quantity: 2,
    unit: "lbs",
    calories: 750,
    protein: 140,
    carbs: 0,
    fat: 16,
    expiresInDays: 2,
    addedDaysAgo: 1,
  },
  {
    name: "Salmon Fillet",
    category: "Protein",
    quantity: 1,
    unit: "lb",
    calories: 830,
    protein: 92,
    carbs: 0,
    fat: 50,
    expiresInDays: 1,
    addedDaysAgo: 0,
  },
  {
    name: "Ground Beef",
    category: "Protein",
    quantity: 1,
    unit: "lb",
    calories: 1150,
    protein: 78,
    carbs: 0,
    fat: 92,
    expiresInDays: 2,
    addedDaysAgo: 2,
  },
  {
    name: "Tofu",
    category: "Protein",
    quantity: 14,
    unit: "oz",
    calories: 290,
    protein: 34,
    carbs: 7,
    fat: 17,
    expiresInDays: 7,
    addedDaysAgo: 3,
  },
  {
    name: "Turkey Slices",
    category: "Protein",
    quantity: 8,
    unit: "oz",
    calories: 240,
    protein: 44,
    carbs: 4,
    fat: 4,
    expiresInDays: 4,
    addedDaysAgo: 2,
  },
  {
    name: "Eggs",
    category: "Protein",
    quantity: 12,
    unit: "count",
    calories: 840,
    protein: 72,
    carbs: 6,
    fat: 60,
    expiresInDays: 14,
    addedDaysAgo: 4,
  },
  {
    name: "Broccoli",
    category: "Produce",
    quantity: 2,
    unit: "heads",
    calories: 100,
    protein: 8,
    carbs: 20,
    fat: 1,
    expiresInDays: 3,
    addedDaysAgo: 1,
  },
  {
    name: "Spinach",
    category: "Produce",
    quantity: 5,
    unit: "oz",
    calories: 35,
    protein: 4,
    carbs: 5,
    fat: 0.5,
    expiresInDays: 2,
    addedDaysAgo: 2,
  },
  {
    name: "Bell Peppers",
    category: "Produce",
    quantity: 3,
    unit: "count",
    calories: 90,
    protein: 3,
    carbs: 18,
    fat: 1,
    expiresInDays: 6,
    addedDaysAgo: 3,
  },
  {
    name: "Carrots",
    category: "Produce",
    quantity: 1,
    unit: "lb",
    calories: 190,
    protein: 4,
    carbs: 44,
    fat: 1,
    expiresInDays: 10,
    addedDaysAgo: 5,
  },
  {
    name: "Avocado",
    category: "Produce",
    quantity: 2,
    unit: "count",
    calories: 480,
    protein: 6,
    carbs: 26,
    fat: 44,
    expiresInDays: 2,
    addedDaysAgo: 1,
  },
  {
    name: "Bananas",
    category: "Produce",
    quantity: 6,
    unit: "count",
    calories: 630,
    protein: 8,
    carbs: 162,
    fat: 2,
    expiresInDays: 3,
    addedDaysAgo: 2,
  },
  {
    name: "Strawberries",
    category: "Produce",
    quantity: 16,
    unit: "oz",
    calories: 145,
    protein: 3,
    carbs: 35,
    fat: 1.5,
    expiresInDays: 2,
    addedDaysAgo: 0,
  },
  {
    name: "Blueberries",
    category: "Produce",
    quantity: 6,
    unit: "oz",
    calories: 95,
    protein: 1,
    carbs: 24,
    fat: 0.5,
    expiresInDays: 3,
    addedDaysAgo: 1,
  },
  {
    name: "Apples",
    category: "Produce",
    quantity: 5,
    unit: "count",
    calories: 475,
    protein: 2.5,
    carbs: 125,
    fat: 1.5,
    expiresInDays: 12,
    addedDaysAgo: 6,
  },
  {
    name: "Greek Yogurt",
    category: "Dairy",
    quantity: 32,
    unit: "oz",
    calories: 520,
    protein: 80,
    carbs: 32,
    fat: 8,
    expiresInDays: 2,
    addedDaysAgo: 3,
  },
  {
    name: "Milk",
    category: "Dairy",
    quantity: 0.5,
    unit: "gallon",
    calories: 1160,
    protein: 60,
    carbs: 96,
    fat: 60,
    expiresInDays: 4,
    addedDaysAgo: 2,
  },
  {
    name: "Cheddar Cheese",
    category: "Dairy",
    quantity: 8,
    unit: "oz",
    calories: 900,
    protein: 56,
    carbs: 4,
    fat: 74,
    expiresInDays: 21,
    addedDaysAgo: 5,
  },
  {
    name: "Cottage Cheese",
    category: "Dairy",
    quantity: 16,
    unit: "oz",
    calories: 360,
    protein: 50,
    carbs: 14,
    fat: 10,
    expiresInDays: 9,
    addedDaysAgo: 4,
  },
  {
    name: "Butter",
    category: "Dairy",
    quantity: 8,
    unit: "oz",
    calories: 1620,
    protein: 2,
    carbs: 0,
    fat: 182,
    expiresInDays: 30,
    addedDaysAgo: 8,
  },
  {
    name: "Brown Rice",
    category: "Grains",
    quantity: 2,
    unit: "lbs",
    calories: 3280,
    protein: 68,
    carbs: 688,
    fat: 26,
    expiresInDays: null,
    addedDaysAgo: 6,
  },
  {
    name: "Quinoa",
    category: "Grains",
    quantity: 1,
    unit: "lb",
    calories: 1670,
    protein: 64,
    carbs: 292,
    fat: 27,
    expiresInDays: null,
    addedDaysAgo: 7,
  },
  {
    name: "Whole Wheat Bread",
    category: "Grains",
    quantity: 1,
    unit: "loaf",
    calories: 1120,
    protein: 56,
    carbs: 196,
    fat: 16,
    expiresInDays: 5,
    addedDaysAgo: 2,
  },
  {
    name: "Pasta",
    category: "Grains",
    quantity: 1,
    unit: "lb",
    calories: 1680,
    protein: 59,
    carbs: 340,
    fat: 7,
    expiresInDays: null,
    addedDaysAgo: 9,
  },
  {
    name: "Rolled Oats",
    category: "Grains",
    quantity: 18,
    unit: "oz",
    calories: 1900,
    protein: 66,
    carbs: 340,
    fat: 34,
    expiresInDays: null,
    addedDaysAgo: 8,
  },
  {
    name: "Peanut Butter",
    category: "Pantry",
    quantity: 16,
    unit: "oz",
    calories: 2660,
    protein: 112,
    carbs: 90,
    fat: 228,
    expiresInDays: null,
    addedDaysAgo: 10,
  },
  {
    name: "Black Beans",
    category: "Pantry",
    quantity: 15,
    unit: "oz",
    calories: 385,
    protein: 25,
    carbs: 70,
    fat: 1.5,
    expiresInDays: null,
    addedDaysAgo: 9,
  },
  {
    name: "Olive Oil",
    category: "Pantry",
    quantity: 16,
    unit: "fl oz",
    calories: 3820,
    protein: 0,
    carbs: 0,
    fat: 432,
    expiresInDays: null,
    addedDaysAgo: 12,
  },
  {
    name: "Hummus",
    category: "Snacks",
    quantity: 10,
    unit: "oz",
    calories: 470,
    protein: 14,
    carbs: 40,
    fat: 28,
    expiresInDays: 6,
    addedDaysAgo: 3,
  },
  {
    name: "Almonds",
    category: "Snacks",
    quantity: 8,
    unit: "oz",
    calories: 1300,
    protein: 48,
    carbs: 48,
    fat: 112,
    expiresInDays: null,
    addedDaysAgo: 7,
  },
];

async function main() {
  const { data: existing, errors } = await client.models.FoodItem.list({ limit: 1 });
  if (errors) {
    console.error("Could not reach the FoodItem API:", errors);
    process.exit(1);
  }
  if (existing.length > 0) {
    console.log("FoodItem table already has data — skipping seed.");
    return;
  }

  console.log(`Seeding ${SEED_ITEMS.length} food items…`);
  for (const item of SEED_ITEMS) {
    const { errors: createErrors } = await client.models.FoodItem.create({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      expirationDate: item.expiresInDays === null ? null : daysFromNow(item.expiresInDays),
      addedAt: daysFromNow(-item.addedDaysAgo),
    });
    if (createErrors) {
      console.error(`Failed to create ${item.name}:`, createErrors);
      process.exit(1);
    }
    console.log(`  + ${item.name}`);
  }
  console.log("Done! Open http://localhost:3000/food-tracker to see your items.");
}

await main();
