import React from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import LoginRoute from "./components/auth/LoginRoute";
import RegisterRoute from "./components/auth/RegisterRoute";
import ForgotPasswordRoute from "./components/auth/ForgotPasswordRoute";
import VerificationRoute from "./components/auth/VerificationRoute";
import AuthCallbackRoute from "./components/auth/AuthCallbackRoute";
import DashboardRoute from "./components/home/DashboardRoute";
import DocRoute from "./components/doc/DocRoute";
import ErrorRoute from "./components/auth/ErrorRoute";
import ResetPasswordRoute from "./components/auth/ResetPasswordRoute";
import AdminUsersRoute from "./components/admin/AdminUsersRoute";
import AdminCmsRoute from "./components/admin/AdminCmsRoute";

// Global deep-link listener — always mounted, navigates to /auth-callback when OS fires saas-forge://
function DeepLinkHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    window.api?.onDeepLink((url: string) => {
      try {
        const parsed = new URL(url);
        const error = parsed.searchParams.get("error");
        if (error) {
          navigate("/error", { replace: true, state: { error } });
          return;
        }
      } catch {
        // ignore parse errors
      }
      navigate("/auth-callback", { replace: true });
    });
  }, [navigate]);

  return null;
}

function App() {
  const themeType = (import.meta.env.VITE_THEME_TYPE || "system") as "light" | "dark" | "system";

  return (
    <ThemeProvider defaultTheme={themeType}>
      <HashRouter>
        <Toaster position="top-center" richColors />
        <DeepLinkHandler />
        <div className="flex h-screen w-full bg-background font-sans antialiased text-foreground">
          <Routes>
            <Route path="/sign-in" element={<LoginRoute />} />
            <Route path="/sign-up" element={<RegisterRoute />} />
            <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
            <Route path="/reset-password" element={<ResetPasswordRoute />} />
            <Route path="/email-verified" element={<VerificationRoute />} />
            <Route path="/error" element={<ErrorRoute />} />
            <Route path="/auth-callback" element={<AuthCallbackRoute />} />
            <Route path="/admin/users" element={<AdminUsersRoute />} />
            <Route path="/admin/cms" element={<AdminCmsRoute />} />
            <Route path="/doc" element={<DocRoute />} />
            <Route path="/doc/:slug" element={<DocRoute />} />
            <Route path="/" element={<DashboardRoute />} />
          </Routes>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
