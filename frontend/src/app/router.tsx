import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "../components/layout/app-shell";
import { LoginPage } from "../routes/login";
import { RegisterPage } from "../routes/register";
import { DigestPage } from "../routes/digest";
import { ComposePage } from "../routes/compose";
import { LibraryPage } from "../routes/library";
import { SettingsPage } from "../routes/settings";
import { useAuth } from "../features/auth/store";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const { user, loading } = useAuth.getState();
    throw redirect({ to: loading || !user ? "/login" : "/digest" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-layout",
  component: AppShell,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState();
    if (!loading && !user) {
      throw redirect({ to: "/login" });
    }
  },
});

const digestRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/digest",
  component: DigestPage,
});

const composeRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/compose",
  component: ComposePage,
});

const libraryRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/library",
  component: LibraryPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  authLayout.addChildren([digestRoute, composeRoute, libraryRoute, settingsRoute]),
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
