import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Apple,
	BarChart3,
	Database,
	Shield,
	UtensilsCrossed,
	Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const features = [
		{
			icon: <UtensilsCrossed className="w-12 h-12 text-amber-400" />,
			title: "Food Tracking",
			description:
				"Track your food consumption with detailed nutritional information and expiration dates.",
		},
		{
			icon: <BarChart3 className="w-12 h-12 text-amber-400" />,
			title: "Nutrition Analytics",
			description:
				"Monitor calories, protein, carbs, and fat intake with comprehensive tracking.",
		},
		{
			icon: <Database className="w-12 h-12 text-amber-400" />,
			title: "Persistent Storage",
			description:
				"Your food data is safely stored in PostgreSQL with Drizzle ORM for reliability.",
		},
		{
			icon: <Shield className="w-12 h-12 text-amber-400" />,
			title: "Type Safety",
			description:
				"Built with TypeScript and Zod validation for bulletproof data integrity.",
		},
		{
			icon: <Zap className="w-12 h-12 text-amber-400" />,
			title: "Real-time Updates",
			description:
				"Instant updates with server functions and optimistic UI patterns.",
		},
		{
			icon: <Apple className="w-12 h-12 text-amber-400" />,
			title: "Smart Categories",
			description:
				"Organize your food items by categories for better inventory management.",
		},
	];

	return (
		<div>
			{/* Hero Section */}
			<section className="relative py-20 px-6 text-center overflow-hidden">
				<div className="absolute inset-0 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10"></div>
				<div
					className="absolute inset-0 opacity-30"
					style={{
						backgroundImage: "url(/food-hero-bg.svg)",
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
					}}
				></div>
				<div className="relative max-w-5xl mx-auto">
					<div className="flex items-center justify-center gap-6 mb-8">
						<div className="relative">
							<div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl"></div>
							<UtensilsCrossed className="relative w-20 h-20 md:w-24 md:h-24 text-amber-400" />
						</div>
						<h1 className="text-5xl md:text-7xl font-black text-white [letter-spacing:-0.08em]">
							<span className="text-gray-300">FOOD</span>{" "}
							<span className="bg-linear-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
								TRACKER
							</span>
						</h1>
					</div>

					<p className="text-2xl md:text-3xl text-gray-300 mb-6 font-light">
						Smart food management made simple
					</p>

					<p className="text-lg text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
						Track your food consumption, monitor nutrition, and manage your
						inventory with our modern, type-safe application built on TanStack
						Start and PostgreSQL.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
						<Link
							to="/food-tracker"
							className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
						>
							Start Tracking Food
						</Link>
						<a
							href="https://tanstack.com/start"
							target="_blank"
							rel="noopener noreferrer"
							className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-slate-600 hover:border-slate-500"
						>
							View Documentation
						</a>
					</div>

					<div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
						<div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
						<span className="text-sm text-gray-400">
							Built with TanStack Start + Drizzle + PostgreSQL
						</span>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 px-6 max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
						Everything you need to track your food
					</h2>
					<p className="text-xl text-gray-400 max-w-2xl mx-auto">
						A comprehensive solution for managing your food consumption and
						nutrition goals
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{features.map((feature) => (
						<div
							key={feature.title}
							className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1"
						>
							<div className="mb-6 transform group-hover:scale-110 transition-transform duration-200">
								{feature.icon}
							</div>
							<h3 className="text-xl font-semibold text-white mb-4">
								{feature.title}
							</h3>
							<p className="text-gray-400 leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-6 text-center">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
						Ready to start tracking?
					</h2>
					<p className="text-xl text-gray-400 mb-8">
						Join the modern way of managing your food consumption and nutrition
						goals.
					</p>
					<Link
						to="/food-tracker"
						className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
					>
						<UtensilsCrossed className="w-5 h-5" />
						Get Started Now
					</Link>
				</div>
			</section>
			{/* Footer */}
			<footer className="border-t border-slate-700 py-6 px-6">
				<div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="text-center md:text-left">
						<p className="text-gray-400 text-sm">© 2026 Food Tracker</p>
						<p className="text-gray-500 text-xs mt-0.5">
							Built with React, TanStack Router, and AWS Amplify
						</p>
					</div>
					<nav className="flex items-center gap-6">
						<a href="#" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">Docs</a>
						<a href="#" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">GitHub</a>
						<a href="#" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">Privacy</a>
					</nav>
				</div>
			</footer>
		</div>
	);
}
