import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/stores/auth";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Board from "@/pages/Board";
import Chat from "@/pages/Chat";
import Docs from "@/pages/Docs";
import Files from "@/pages/Files";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import Approvals from "@/pages/Approvals";
import CalendarPage from "@/pages/Calendar";
import AppStore from "@/pages/AppStore";
import Meetings from "@/pages/Meetings";

function RequireAuth() {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "projects/:id", element: <Board /> },
      { path: "messages", element: <Chat /> },
      { path: "docs", element: <Docs /> },
      { path: "files", element: <Files /> },
      { path: "admin", element: <Admin /> },
      { path: "settings", element: <Settings /> },
      { path: "approvals", element: <Approvals /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "apps", element: <AppStore /> },
      { path: "meetings", element: <Meetings /> },
    ],
  },
]);
