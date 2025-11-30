import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { KoreanKeyboardProvider } from '@/components/KoreanKeyboardProvider';
import { KoreanKeyboardToggle } from '@/components/KoreanKeyboardToggle';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <KoreanKeyboardProvider>
      <ThemeToggle />
      <Outlet />
      <KoreanKeyboardToggle />
      <Analytics />
    </KoreanKeyboardProvider>
  );
}
