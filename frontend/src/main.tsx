import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { AppRouter } from "./app/router";
import { useAuth } from "./features/auth/store";
import { setOnUnauthorized } from "./api/client";

import "./styles/app.css";
import "./i18n/index";

setOnUnauthorized(() => useAuth.getState().clearSession());

const queryClient = new QueryClient();

function Root() {
  const load = useAuth((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1d1f24",
              color: "#f7f6f3",
              border: "1px solid rgba(226,224,219,0.2)",
            },
          }}
        />
      </QueryClientProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
