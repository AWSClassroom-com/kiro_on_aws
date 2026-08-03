import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NavBar } from "../components/NavBar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-900 text-white antialiased">
      <NavBar />
      <Outlet />
    </div>
  );
}
