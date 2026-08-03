import { createFileRoute } from "@tanstack/react-router";
import { generateClient } from "aws-amplify/data";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

type FoodItem = Schema["FoodItem"]["type"];

export const Route = createFileRoute("/food-tracker")({
  component: FoodTrackerPage,
});

const CATEGORIES = ["Produce", "Protein", "Dairy", "Grains", "Pantry", "Snacks", "Beverages"];

function FoodTrackerPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const { data } = await client.models.FoodItem.list();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(id: string) {
    await client.models.FoodItem.delete({ id });
    await loadItems();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Food Tracker</h1>
        <p className="mt-1 text-slate-300">
          Everything in your kitchen — {items.length} item{items.length === 1 ? "" : "s"} tracked.
        </p>
      </div>

      <AddFoodForm onAdded={loadItems} />

      <FoodEntriesList items={items} loading={loading} onDelete={handleDelete} />
    </main>
  );
}

function AddFoodForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const expirationDate = String(formData.get("expirationDate") ?? "");
    const numberOrNull = (field: string) => {
      const value = String(formData.get(field) ?? "").trim();
      return value === "" ? null : Number(value);
    };

    setSaving(true);
    await client.models.FoodItem.create({
      name,
      category: String(formData.get("category") ?? "Pantry"),
      quantity: numberOrNull("quantity"),
      unit: String(formData.get("unit") ?? "").trim() || null,
      calories: numberOrNull("calories"),
      protein: numberOrNull("protein"),
      carbs: numberOrNull("carbs"),
      fat: numberOrNull("fat"),
      expirationDate: expirationDate ? `${expirationDate}T12:00:00.000Z` : null,
      addedAt: new Date().toISOString(),
    });
    form.reset();
    setSaving(false);
    await onAdded();
  }

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6"
    >
      <h2 className="mb-4 text-lg font-semibold">Add a food item</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1 block text-xs text-slate-300">
            Name *
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Greek Yogurt"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs text-slate-300">
            Category
          </label>
          <select id="category" name="category" className={inputClass}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="expirationDate" className="mb-1 block text-xs text-slate-300">
            Expiration date
          </label>
          <input
            id="expirationDate"
            name="expirationDate"
            type="date"
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="mb-1 block text-xs text-slate-300">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0"
              placeholder="1"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="unit" className="mb-1 block text-xs text-slate-300">
              Unit
            </label>
            <input id="unit" name="unit" placeholder="lbs, cups…" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="calories" className="mb-1 block text-xs text-slate-300">
            Calories
          </label>
          <input
            id="calories"
            name="calories"
            type="number"
            min="0"
            placeholder="120"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          <div>
            <label htmlFor="protein" className="mb-1 block text-xs text-slate-300">
              Protein (g)
            </label>
            <input
              id="protein"
              name="protein"
              type="number"
              step="any"
              min="0"
              placeholder="10"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="carbs" className="mb-1 block text-xs text-slate-300">
              Carbs (g)
            </label>
            <input
              id="carbs"
              name="carbs"
              type="number"
              step="any"
              min="0"
              placeholder="15"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fat" className="mb-1 block text-xs text-slate-300">
              Fat (g)
            </label>
            <input
              id="fat"
              name="fat"
              type="number"
              step="any"
              min="0"
              placeholder="5"
              className={inputClass}
            />
          </div>
        </div>
      </div>
      <div className="mt-5">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Item"}
        </button>
      </div>
    </form>
  );
}

function FoodEntriesList({
  items,
  loading,
  onDelete,
}: {
  items: FoodItem[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  if (loading) {
    return <p className="py-12 text-center text-slate-300">Loading your food items…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-600 py-16 text-center">
        <p className="text-slate-300">No food items yet.</p>
        <p className="mt-1 text-sm text-slate-400">
          Add your first item above, or run <code className="text-emerald-400">npm run seed</code>{" "}
          to load sample data.
        </p>
      </div>
    );
  }

  // Newest entries first.
  const sortedItems = [...items].sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Your food items</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedItems.map((item) => (
          <article
            key={item.id}
            className="relative rounded-xl border border-slate-600 bg-slate-800 p-5 transition-colors hover:border-slate-500"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{item.name}</h3>
                {item.quantity != null && (
                  <p className="text-sm text-slate-300">
                    {item.quantity} {item.unit ?? ""}
                  </p>
                )}
              </div>
              {item.category && (
                <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-200">
                  {item.category}
                </span>
              )}
            </div>

            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{item.calories ?? "—"}</span>
              <span className="text-xs text-slate-400">kcal</span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-700/60 py-1.5">
                <p className="font-medium text-white">{item.protein ?? "—"}g</p>
                <p className="text-slate-400">Protein</p>
              </div>
              <div className="rounded-lg bg-slate-700/60 py-1.5">
                <p className="font-medium text-white">{item.carbs ?? "—"}g</p>
                <p className="text-slate-400">Carbs</p>
              </div>
              <div className="rounded-lg bg-slate-700/60 py-1.5">
                <p className="font-medium text-white">{item.fat ?? "—"}g</p>
                <p className="text-slate-400">Fat</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-400">
              <span>
                {item.expirationDate
                  ? `Expires ${formatDate(item.expirationDate)}`
                  : "No expiration"}
              </span>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="text-slate-400 transition-colors hover:text-red-400"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
