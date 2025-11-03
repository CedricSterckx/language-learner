import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 size-8 sm:size-9 md:size-10"
        aria-label="Toggle theme"
      >
        <Sun className="size-4 sm:size-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 size-8 sm:size-9 md:size-10"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="size-4 sm:size-5" />
      ) : (
        <Moon className="size-4 sm:size-5" />
      )}
    </Button>
  );
}

