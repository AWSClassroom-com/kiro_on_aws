import { Link } from "@tanstack/react-router";

export function NavBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-white">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span>Food Tracker</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            className="text-slate-300 transition-colors hover:text-white [&.active]:text-white"
          >
            Home
          </Link>
          <Link
            to="/food-tracker"
            className="text-slate-300 transition-colors hover:text-white [&.active]:text-white"
          >
            Food Tracker
          </Link>
        </div>
      </nav>
    </header>
  );
}
