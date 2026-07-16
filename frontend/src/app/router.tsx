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
import { DigestPage } from "../features/digest/page";
import { ComposePage } from "../features/compose/page";
import { LibraryPage } from "../features/library/page";
import { SettingsPage } from "../features/settings/page";
import { NewslettersPage } from "../features/newsletters/page";
import { NewsletterEditorPage } from "../features/newsletters/editor-page";
import { IdeasPage } from "../features/ideas/page";
import { useAuth } from "../features/auth/store";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const { user, loading } = useAuth.getState();
    throw redirect({ to: loading || !user ? "/login" : "/discover" });
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

const discoverRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/discover",
  component: DigestPage,
});

// Legacy redirect: /digest → /discover
const digestLegacyRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/digest",
  beforeLoad: () => {
    throw redirect({ to: "/discover" });
  },
});

const articlesRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/content/articles",
  component: ComposePage,
});

const contentNewslettersRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/content/newsletters",
  component: NewslettersPage,
});

const newsletterEditRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/content/newsletters/$id/edit",
  component: NewsletterEditorPage,
});

const ideasRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/content/ideas",
  component: IdeasPage,
});

// Keep old routes working via redirects
const newslettersLegacyRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/newsletters",
  beforeLoad: () => {
    throw redirect({ to: "/content/newsletters" });
  },
});

const composeLegacyRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/compose",
  beforeLoad: () => {
    throw redirect({ to: "/content/articles" });
  },
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
  authLayout.addChildren([
    discoverRoute,
    digestLegacyRoute,
    articlesRoute,
    contentNewslettersRoute,
    newsletterEditRoute,
    ideasRoute,
    newslettersLegacyRoute,
    composeLegacyRoute,
    libraryRoute,
    settingsRoute,
  ]),
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
