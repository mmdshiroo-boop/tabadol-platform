// app-provider.tsx
"use client";

import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import { ThemeProvider } from "./theme-provider";
import { RegistrationWall } from "@/components/ui/RegistrationWall";
import { useBrowseGate } from "@/hooks/useBrowseGate";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}

function BrowseGateLayer({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { shouldBlock } = useBrowseGate(!!user);

  if (loading) return <>{children}</>;

  return (
    <>
      {children}
      <RegistrationWall visible={shouldBlock} />
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <BrowseGateLayer>{children}</BrowseGateLayer>
    </Providers>
  );
}
