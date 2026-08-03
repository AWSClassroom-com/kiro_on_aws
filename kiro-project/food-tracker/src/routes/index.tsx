import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  {
    title: "Track Everything",
    description:
      "Log every item in your kitchen with nutrition facts, quantities, and expiration dates in one place.",
  },
  {
    title: "Beat Expiration Dates",
    description: "See what's fresh and what's fading so food gets eaten instead of thrown away.",
  },
  {
    title: "Know Your Nutrition",
    description:
      "Calories, protein, carbs, and fat for every entry — understand what you're actually eating.",
  },
];

function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Track smarter, waste less
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
          Your kitchen,{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            fully tracked
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Food Tracker keeps tabs on everything in your fridge and pantry — what you have, what it's
          worth nutritionally, and when it expires — so nothing goes to waste.
        </p>
        <div className="mt-10">
          <Link
            to="/food-tracker"
            className="inline-block rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/40"
          >
            Start Tracking Food
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-700 bg-slate-800 p-8 transition-colors hover:border-cyan-400/60"
            >
              <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
              <h2 className="mb-2 text-lg font-semibold text-white">{feature.title}</h2>
              <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to take control of your kitchen?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Add your first food item in seconds. Your future self — and your grocery budget — will
            thank you.
          </p>
          <div className="mt-8">
            <Link
              to="/food-tracker"
              className="inline-block rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-emerald-400 hover:to-cyan-400 hover:shadow-cyan-400/40"
            >
              Open the Tracker
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
