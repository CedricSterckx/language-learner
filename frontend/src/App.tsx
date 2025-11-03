import { createRouter, RouterProvider } from '@tanstack/react-router';
import './App.css';
import { routeTree } from './routeTree.gen';
import { ThemeProvider } from '@/components/ThemeProvider';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
