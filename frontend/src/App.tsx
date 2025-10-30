import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/next';
import './App.css';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <>
      <RouterProvider router={router} />;
      <Analytics />
    </>
  );
}

export default App;
