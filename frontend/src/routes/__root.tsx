import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <ThemeToggle />
      <Outlet />
      <Analytics />
    </>
  );
}
