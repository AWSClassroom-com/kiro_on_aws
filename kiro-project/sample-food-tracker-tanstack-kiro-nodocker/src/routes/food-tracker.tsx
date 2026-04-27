import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { db } from "@/db";
import { foodItems, insertFoodItemSchema } from "@/db/schema";

// Server function for creating food entries
const createFoodEntry = createServerFn({ method: "POST" })
	.inputValidator(
		insertFoodItemSchema.pick({
			name: true,
			description: true,
			category: true,
			quantity: true,
			unit: true,
			calories: true,
			protein: true,
			carbs: true,
			fat: true,
			expirationDate: true,
		}),
	)
	.handler(async ({ data }) => {
		try {
			// Convert decimal numbers to strings for database storage
			const insertData = {
				...data,
				protein: data.protein?.toString(),
				carbs: data.carbs?.toString(),
				fat: data.fat?.toString(),
			};

			const [newEntry] = await db
				.insert(foodItems)
				.values(insertData)
				.returning();
			return { success: true, data: newEntry };
		} catch (error) {
			console.error("Error creating food entry:", error);
			throw new Error("Failed to create food entry. Please try again.");
		}
	});

// Server function for fetching food entries
const getFoodEntries = createServerFn({ method: "GET" }).handler(async () => {
	try {
		const entries = await db
			.select()
			.from(foodItems)
			.orderBy(desc(foodItems.createdAt));
		return { success: true, data: entries };
	} catch (error) {
		console.error("Error fetching food entries:", error);
		throw new Error("Failed to fetch food entries. Please try again.");
	}
});

// Server function for deleting food entries
const deleteFoodEntry = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data }) => {
		try {
			const [deletedEntry] = await db
				.delete(foodItems)
				.where(eq(foodItems.id, data.id))
				.returning();

			if (!deletedEntry) {
				throw new Error("Food entry not found");
			}

			return { success: true, data: deletedEntry };
		} catch (error) {
			console.error("Error deleting food entry:", error);
			throw new Error("Failed to delete food entry. Please try again.");
		}
	});

export const Route = createFileRoute("/food-tracker")({
	component: FoodTracker,
});

// Form validation schema
const formSchema = insertFoodItemSchema.pick({
	name: true,
	description: true,
	category: true,
	quantity: true,
	unit: true,
	calories: true,
	protein: true,
	carbs: true,
	fat: true,
	expirationDate: true,
});

type FormData = z.infer<typeof formSchema>;

function AddFoodForm({ onSuccess }: { onSuccess: () => void }) {
	const [formData, setFormData] = useState<Partial<FormData>>({
		quantity: 1,
		unit: "piece",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");

	const handleInputChange = (
		field: keyof FormData,
		value: string | number | Date | undefined,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrors({});
		setSuccessMessage("");

		try {
			// Validate form data
			const validatedData = formSchema.parse(formData);

			// Submit to server
			const result = await createFoodEntry({ data: validatedData });

			if (result.success) {
				setSuccessMessage("Food entry added successfully!");
				setFormData({ quantity: 1, unit: "piece" }); // Reset form
				onSuccess(); // Refresh the list

				// Clear success message after 3 seconds
				setTimeout(() => setSuccessMessage(""), 3000);
			}
		} catch (error) {
			if (error instanceof z.ZodError) {
				// Handle validation errors
				const fieldErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					if (err.path[0]) {
						fieldErrors[err.path[0] as string] = err.message;
					}
				});
				setErrors(fieldErrors);
			} else {
				// Handle server errors
				setErrors({
					general: error instanceof Error ? error.message : "An error occurred",
				});
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
			<h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
				<Plus className="w-6 h-6 text-cyan-400" />
				Add New Food Entry
			</h2>

			{successMessage && (
				<div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
					{successMessage}
				</div>
			)}

			{errors.general && (
				<div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
					{errors.general}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Name Field */}
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Food Name *
					</label>
					<input
						type="text"
						value={formData.name || ""}
						onChange={(e) => handleInputChange("name", e.target.value)}
						className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors ${
							errors.name ? "border-red-500" : "border-slate-600"
						}`}
						placeholder="Enter food name"
					/>
					{errors.name && (
						<p className="mt-1 text-sm text-red-400">{errors.name}</p>
					)}
				</div>

				{/* Description Field */}
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Description
					</label>
					<textarea
						value={formData.description || ""}
						onChange={(e) => handleInputChange("description", e.target.value)}
						className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors resize-none"
						placeholder="Optional description"
						rows={3}
					/>
				</div>

				{/* Category and Unit Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Category
						</label>
						<input
							type="text"
							value={formData.category || ""}
							onChange={(e) => handleInputChange("category", e.target.value)}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
							placeholder="e.g., Fruits, Vegetables"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Unit
						</label>
						<select
							value={formData.unit || "piece"}
							onChange={(e) => handleInputChange("unit", e.target.value)}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
						>
							<option value="piece">Piece</option>
							<option value="gram">Gram</option>
							<option value="kilogram">Kilogram</option>
							<option value="cup">Cup</option>
							<option value="tablespoon">Tablespoon</option>
							<option value="teaspoon">Teaspoon</option>
							<option value="liter">Liter</option>
							<option value="milliliter">Milliliter</option>
						</select>
					</div>
				</div>

				{/* Quantity and Calories Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Quantity
						</label>
						<input
							type="number"
							min="1"
							value={formData.quantity || 1}
							onChange={(e) =>
								handleInputChange("quantity", parseInt(e.target.value) || 1)
							}
							className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors ${
								errors.quantity ? "border-red-500" : "border-slate-600"
							}`}
						/>
						{errors.quantity && (
							<p className="mt-1 text-sm text-red-400">{errors.quantity}</p>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Calories
						</label>
						<input
							type="number"
							min="0"
							value={formData.calories || ""}
							onChange={(e) =>
								handleInputChange(
									"calories",
									parseInt(e.target.value) || undefined,
								)
							}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
							placeholder="Optional"
						/>
					</div>
				</div>

				{/* Nutrition Row */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Protein (g)
						</label>
						<input
							type="number"
							min="0"
							step="0.1"
							value={formData.protein || ""}
							onChange={(e) =>
								handleInputChange(
									"protein",
									parseFloat(e.target.value) || undefined,
								)
							}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
							placeholder="Optional"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Carbs (g)
						</label>
						<input
							type="number"
							min="0"
							step="0.1"
							value={formData.carbs || ""}
							onChange={(e) =>
								handleInputChange(
									"carbs",
									parseFloat(e.target.value) || undefined,
								)
							}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
							placeholder="Optional"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Fat (g)
						</label>
						<input
							type="number"
							min="0"
							step="0.1"
							value={formData.fat || ""}
							onChange={(e) =>
								handleInputChange(
									"fat",
									parseFloat(e.target.value) || undefined,
								)
							}
							className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
							placeholder="Optional"
						/>
					</div>
				</div>

				{/* Expiration Date */}
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						Expiration Date
					</label>
					<input
						type="date"
						value={
							formData.expirationDate
								? new Date(formData.expirationDate).toISOString().split("T")[0]
								: ""
						}
						onChange={(e) =>
							handleInputChange(
								"expirationDate",
								e.target.value ? new Date(e.target.value) : undefined,
							)
						}
						className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
					/>
				</div>

				{/* Submit Button */}
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full py-4 bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:shadow-none"
				>
					{isSubmitting ? "Adding..." : "Add Food Entry"}
				</button>
			</form>
		</div>
	);
}

interface FoodEntry {
	id: number;
	name: string;
	description: string | null;
	category: string | null;
	quantity: number | null;
	unit: string | null;
	calories: number | null;
	protein: string | null;
	carbs: string | null;
	fat: string | null;
	expirationDate: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

function FoodEntriesList({
	entries,
	onDelete,
}: {
	entries: FoodEntry[];
	onDelete: (id: number) => void;
}) {
	const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

	const handleDelete = async (id: number) => {
		try {
			await deleteFoodEntry({ data: { id } });
			onDelete(id);
			setDeleteConfirm(null);
		} catch (error) {
			console.error("Error deleting entry:", error);
		}
	};

	if (entries.length === 0) {
		return (
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
				<h2 className="text-2xl font-semibold text-white mb-6">
					Your Food Entries
				</h2>
				<div className="text-center py-12">
					<UtensilsCrossed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
					<p className="text-gray-400 text-lg">No food entries yet</p>
					<p className="text-gray-500 text-sm mt-2">
						Add your first food entry above to get started!
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
			<h2 className="text-2xl font-semibold text-white mb-6">
				Your Food Entries
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{entries.map((entry) => (
					<div
						key={entry.id}
						className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
					>
						<div className="flex justify-between items-start mb-4">
							<h3 className="text-lg font-semibold text-white truncate">
								{entry.name}
							</h3>
							<button
								type="button"
								onClick={() => setDeleteConfirm(entry.id)}
								className="text-gray-400 hover:text-red-400 transition-colors p-1"
								title="Delete entry"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>

						{entry.description && (
							<p className="text-gray-400 text-sm mb-3 line-clamp-2">
								{entry.description}
							</p>
						)}

						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Quantity:</span>
								<span className="text-white">
									{entry.quantity} {entry.unit}
								</span>
							</div>

							{entry.category && (
								<div className="flex justify-between">
									<span className="text-gray-400">Category:</span>
									<span className="text-cyan-400">{entry.category}</span>
								</div>
							)}

							{entry.calories && (
								<div className="flex justify-between">
									<span className="text-gray-400">Calories:</span>
									<span className="text-white">{entry.calories}</span>
								</div>
							)}

							{(entry.protein || entry.carbs || entry.fat) && (
								<div className="pt-2 border-t border-slate-600">
									<div className="grid grid-cols-3 gap-2 text-xs">
										{entry.protein && (
											<div className="text-center">
												<div className="text-gray-400">Protein</div>
												<div className="text-white">{entry.protein}g</div>
											</div>
										)}
										{entry.carbs && (
											<div className="text-center">
												<div className="text-gray-400">Carbs</div>
												<div className="text-white">{entry.carbs}g</div>
											</div>
										)}
										{entry.fat && (
											<div className="text-center">
												<div className="text-gray-400">Fat</div>
												<div className="text-white">{entry.fat}g</div>
											</div>
										)}
									</div>
								</div>
							)}

							{entry.expirationDate && (
								<div className="flex justify-between pt-2 border-t border-slate-600">
									<span className="text-gray-400">Expires:</span>
									<span className="text-yellow-400">
										{new Date(entry.expirationDate).toLocaleDateString()}
									</span>
								</div>
							)}

							<div className="flex justify-between pt-2 border-t border-slate-600">
								<span className="text-gray-400">Added:</span>
								<span className="text-gray-300">
									{new Date(entry.createdAt).toLocaleDateString()}
								</span>
							</div>
						</div>

						{/* Delete Confirmation Modal */}
						{deleteConfirm === entry.id && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
								<div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm mx-4">
									<h3 className="text-lg font-semibold text-white mb-4">
										Delete Food Entry
									</h3>
									<p className="text-gray-400 mb-6">
										Are you sure you want to delete "{entry.name}"? This action
										cannot be undone.
									</p>
									<div className="flex gap-3">
										<button
											type="button"
											onClick={() => setDeleteConfirm(null)}
											className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={() => handleDelete(entry.id)}
											className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function FoodTracker() {
	const [entries, setEntries] = useState<FoodEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadEntries = useCallback(async () => {
		try {
			const result = await getFoodEntries();
			if (result.success) {
				setEntries(result.data);
			}
		} catch (error) {
			console.error("Error loading entries:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleEntryAdded = () => {
		loadEntries(); // Refresh the list
	};

	const handleEntryDeleted = (deletedId: number) => {
		setEntries((prev) => prev.filter((entry) => entry.id !== deletedId));
	};

	useEffect(() => {
		loadEntries();
	}, [loadEntries]);

	return (
		<div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
			<section className="relative py-20 px-6 overflow-hidden">
				<div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
				<div className="relative max-w-4xl mx-auto">
					{/* Header Section */}
					<div className="text-center mb-12">
						<div className="flex items-center justify-center gap-4 mb-6">
							<UtensilsCrossed className="w-16 h-16 text-cyan-400" />
							<h1 className="text-5xl md:text-6xl font-black text-white [letter-spacing:-0.08em]">
								<span className="text-gray-300">FOOD</span>{" "}
								<span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
									TRACKER
								</span>
							</h1>
						</div>
						<p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
							Track your food consumption with style
						</p>
						<p className="text-lg text-gray-400 max-w-2xl mx-auto">
							Add, view, and manage your food entries in a beautiful, modern
							interface.
						</p>
					</div>

					{/* Main Content Area */}
					<div className="space-y-8">
						{/* Add Food Form */}
						<AddFoodForm onSuccess={handleEntryAdded} />

						{/* Food Entries List */}
						{isLoading ? (
							<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
								<div className="text-center py-12">
									<div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
									<p className="text-gray-400">Loading your food entries...</p>
								</div>
							</div>
						) : (
							<FoodEntriesList
								entries={entries}
								onDelete={handleEntryDeleted}
							/>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
