import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { client } from "@/lib/amplify-client";
import type { Schema } from "../../amplify/data/resource";

export const Route = createFileRoute("/food-tracker")({
	component: FoodTracker,
});

type FoodEntry = Schema["FoodItem"]["type"];

interface MacroBreakdown {
	proteinPercent: number;
	carbsPercent: number;
	fatPercent: number;
}

interface NutritionSummary {
	totalCalories: number;
	averageDailyCalories: number;
	macroBreakdown: MacroBreakdown;
	narrative: string;
	suggestions: string[];
}

type SummaryState =
	| { phase: "idle" }
	| { phase: "loading" }
	| { phase: "insufficient-data" }
	| { phase: "success"; summary: NutritionSummary }
	| { phase: "error"; message: string };

const formSchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	description: z.string().optional(),
	category: z.string().max(100, "Category too long").optional(),
	quantity: z
		.number()
		.int()
		.positive("Quantity must be positive")
		.optional(),
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
			const validated = formSchema.parse(formData);

			const { data, errors: createErrors } = await client.models.FoodItem.create(
				{
					name: validated.name,
					description: validated.description,
					category: validated.category,
					quantity: validated.quantity,
					unit: validated.unit,
					calories: validated.calories,
					protein: validated.protein,
					carbs: validated.carbs,
					fat: validated.fat,
					expirationDate: validated.expirationDate?.toISOString(),
					addedAt: new Date().toISOString(),
				},
			);

			if (createErrors?.length || !data) {
				throw new Error(
					createErrors?.map((e) => e.message).join(", ") ||
						"Failed to create food entry",
				);
			}

			setSuccessMessage("Food entry added successfully!");
			setFormData({ quantity: 1, unit: "piece" });
			onSuccess();

			setTimeout(() => setSuccessMessage(""), 3000);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const fieldErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					if (err.path[0]) {
						fieldErrors[err.path[0] as string] = err.message;
					}
				});
				setErrors(fieldErrors);
			} else {
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

function isExpiringSoon(expirationDate: string | null | undefined): boolean {
	if (!expirationDate) return false;
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const expiry = new Date(expirationDate);
	const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
	const diffMs = expiryDay.getTime() - today.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays >= 0 && diffDays <= 3;
}

function FoodEntriesList({
	entries,
	onDelete,
}: {
	entries: FoodEntry[];
	onDelete: (id: string) => void;
}) {
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [filterName, setFilterName] = useState("");
	const [sortKey, setSortKey] = useState<"default" | "name" | "calories" | "expiration">("default");

	const handleDelete = async (id: string) => {
		try {
			await client.models.FoodItem.delete({ id });
			onDelete(id);
			setDeleteConfirm(null);
		} catch (error) {
			console.error("Error deleting entry:", error);
		}
	};

	const visibleEntries = entries
		.filter((e) =>
			filterName.trim() === "" ||
			e.name.toLowerCase().includes(filterName.trim().toLowerCase()),
		)
		.sort((a, b) => {
			if (sortKey === "name") {
				return a.name.localeCompare(b.name);
			}
			if (sortKey === "calories") {
				return (b.calories ?? -1) - (a.calories ?? -1);
			}
			if (sortKey === "expiration") {
				if (!a.expirationDate && !b.expirationDate) return 0;
				if (!a.expirationDate) return 1;
				if (!b.expirationDate) return -1;
				return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
			}
			// default: newest first (original order preserved from parent)
			return 0;
		});

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

			{/* Filter & sort bar */}
			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<input
					type="text"
					value={filterName}
					onChange={(e) => setFilterName(e.target.value)}
					placeholder="Filter by name…"
					className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors text-sm"
				/>
				<select
					value={sortKey}
					onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
					className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors text-sm"
				>
					<option value="default">Sort: Default (newest first)</option>
					<option value="name">Sort: Name (A–Z)</option>
					<option value="calories">Sort: Calories (high to low)</option>
					<option value="expiration">Sort: Expiration Date (soonest first)</option>
				</select>
			</div>

			{visibleEntries.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-400 text-lg">No entries match your filter.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{visibleEntries.map((entry) => (
					<div
						key={entry.id}
						className="relative bg-slate-700/50 border border-slate-600 rounded-lg p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
					>
						{isExpiringSoon(entry.expirationDate) && (
							<span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse-subtle">
								EXPIRING SOON
							</span>
						)}
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

							{entry.calories != null && (
								<div className="flex justify-between">
									<span className="text-gray-400">Calories:</span>
									<span className="text-white">{entry.calories}</span>
								</div>
							)}

							{(entry.protein != null ||
								entry.carbs != null ||
								entry.fat != null) && (
								<div className="pt-2 border-t border-slate-600">
									<div className="grid grid-cols-3 gap-2 text-xs">
										{entry.protein != null && (
											<div className="text-center">
												<div className="text-gray-400">Protein</div>
												<div className="text-white">{entry.protein}g</div>
											</div>
										)}
										{entry.carbs != null && (
											<div className="text-center">
												<div className="text-gray-400">Carbs</div>
												<div className="text-white">{entry.carbs}g</div>
											</div>
										)}
										{entry.fat != null && (
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

							{entry.addedAt && (
								<div className="flex justify-between pt-2 border-t border-slate-600">
									<span className="text-gray-400">Added:</span>
									<span className="text-gray-300">
										{new Date(entry.addedAt).toLocaleDateString()}
									</span>
								</div>
							)}
						</div>

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
			)}
		</div>
	);
}

function SummaryLoadingCard() {
	return (
		<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 flex items-center justify-center gap-4">
			<span className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
			<p className="text-gray-300 text-lg">Analysing your week…</p>
		</div>
	);
}

function InsufficientDataMessage() {
	return (
		<div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-6">
			<p className="text-amber-300 text-sm">
				Not enough data — add at least 3 food entries from the last 7 days to generate a summary.
			</p>
		</div>
	);
}

function SummaryErrorMessage({ message }: { message: string }) {
	return (
		<div className="bg-red-500/10 border border-red-500/40 rounded-xl p-6">
			<p className="text-red-300 text-sm">{message}</p>
		</div>
	);
}

function SummaryCard({ summary }: { summary: NutritionSummary }) {
	return (
		<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 space-y-6">
			<h2 className="text-2xl font-semibold text-white">Weekly Nutrition Summary</h2>

			{/* Calorie stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-slate-700/50 rounded-lg p-4 text-center">
					<p className="text-gray-400 text-sm mb-1">Total Calories</p>
					<p className="text-3xl font-bold text-cyan-400">{summary.totalCalories}</p>
				</div>
				<div className="bg-slate-700/50 rounded-lg p-4 text-center">
					<p className="text-gray-400 text-sm mb-1">Daily Average</p>
					<p className="text-3xl font-bold text-cyan-400">{summary.averageDailyCalories}</p>
				</div>
			</div>

			{/* Macro breakdown */}
			<div>
				<p className="text-gray-400 text-sm mb-3">Macro Breakdown</p>
				<div className="flex gap-3 flex-wrap">
					<span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium px-3 py-1.5 rounded-full">
						Protein {summary.macroBreakdown.proteinPercent.toFixed(1)}%
					</span>
					<span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm font-medium px-3 py-1.5 rounded-full">
						Carbs {summary.macroBreakdown.carbsPercent.toFixed(1)}%
					</span>
					<span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium px-3 py-1.5 rounded-full">
						Fat {summary.macroBreakdown.fatPercent.toFixed(1)}%
					</span>
				</div>
			</div>

			{/* Narrative */}
			<div>
				<p className="text-gray-400 text-sm mb-2">Analysis</p>
				<p className="text-gray-300 leading-relaxed">{summary.narrative}</p>
			</div>

			{/* Suggestions */}
			<div>
				<p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-cyan-400" />
					Suggestions
				</p>
				<ul className="space-y-2">
					{summary.suggestions.map((suggestion, i) => (
						<li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
							<span className="text-cyan-400 mt-0.5">•</span>
							{suggestion}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function FoodTracker() {
	const [entries, setEntries] = useState<FoodEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [summaryState, setSummaryState] = useState<SummaryState>({ phase: "idle" });

	const handleGenerateSummary = async () => {
		const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
		const weeklyEntries = entries.filter(
			(e) => e.addedAt && new Date(e.addedAt).getTime() >= cutoff,
		);

		if (weeklyEntries.length < 3) {
			setSummaryState({ phase: "insufficient-data" });
			return;
		}

		setSummaryState({ phase: "loading" });
		try {
			const { data, errors } = await client.queries.generateWeeklySummary({
				entries: weeklyEntries.map((e) => ({
					name: e.name,
					calories: e.calories ?? null,
					protein: e.protein ?? null,
					carbs: e.carbs ?? null,
					fat: e.fat ?? null,
				})),
			});

			if (errors?.length || !data) {
				setSummaryState({
					phase: "error",
					message: "Failed to generate summary. Please check your connection and try again.",
				});
				return;
			}

			if (data.status === "success" && data.summary) {
				setSummaryState({ phase: "success", summary: data.summary as NutritionSummary });
			} else if (data.status === "insufficient-data") {
				setSummaryState({ phase: "insufficient-data" });
			} else {
				setSummaryState({
					phase: "error",
					message: data.message ?? "Failed to generate summary. Please check your connection and try again.",
				});
			}
		} catch {
			setSummaryState({
				phase: "error",
				message: "Failed to generate summary. Please check your connection and try again.",
			});
		}
	};

	const loadEntries = useCallback(async () => {
		try {
			const { data, errors } = await client.models.FoodItem.list();
			if (errors?.length) {
				console.error("Error loading entries:", errors);
				return;
			}
			const sorted = [...data].sort((a, b) => {
				const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
				const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
				return bTime - aTime;
			});
			setEntries(sorted);
		} catch (error) {
			console.error("Error loading entries:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleEntryAdded = () => {
		loadEntries();
	};

	const handleEntryDeleted = (deletedId: string) => {
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

					<div className="space-y-8">
						<AddFoodForm onSuccess={handleEntryAdded} />

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

						{/* Weekly Summary Button */}
						<button
							type="button"
							onClick={handleGenerateSummary}
							disabled={summaryState.phase === "loading"}
							className="w-full py-4 bg-linear-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:shadow-none flex items-center justify-center gap-2"
						>
							{summaryState.phase === "loading" ? (
								<>
									<span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
									Generating summary…
								</>
							) : (
								"Generate Weekly Summary"
							)}
						</button>

						{/* Result area */}
						{summaryState.phase === "loading" && <SummaryLoadingCard />}
						{summaryState.phase === "insufficient-data" && <InsufficientDataMessage />}
						{summaryState.phase === "error" && <SummaryErrorMessage message={summaryState.message} />}
						{summaryState.phase === "success" && <SummaryCard summary={summaryState.summary} />}
					</div>
				</div>
			</section>
		</div>
	);
}
