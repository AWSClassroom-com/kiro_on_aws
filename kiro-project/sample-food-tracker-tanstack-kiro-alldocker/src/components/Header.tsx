import { Link } from "@tanstack/react-router";
import { Home, Menu, UtensilsCrossed, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<header className="p-4 flex items-center bg-slate-800/95 backdrop-blur-sm text-white shadow-lg border-b border-slate-700">
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Open menu"
				>
					<Menu size={24} />
				</button>
				<h1 className="ml-4 text-xl font-semibold">
					<Link
						to="/"
						className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
					>
						<UtensilsCrossed size={24} className="text-emerald-400" />
						<span className="font-bold">Food Tracker</span>
					</Link>
				</h1>
			</header>

			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-700">
					<h2 className="text-xl font-bold flex items-center gap-2">
						<UtensilsCrossed size={20} className="text-emerald-400" />
						Food Tracker
					</h2>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Close menu"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors mb-2",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					<Link
						to="/food-tracker"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors mb-2",
						}}
					>
						<UtensilsCrossed size={20} />
						<span className="font-medium">Food Tracker</span>
					</Link>
				</nav>
			</aside>
		</>
	);
}
