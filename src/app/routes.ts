import { createBrowserRouter } from "react-router";
import { OperatorDashboard } from "./components/OperatorDashboard";
import { SpectatorView } from "./components/SpectatorView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SpectatorView,
  },
  {
    path: "/admin",
    Component: OperatorDashboard,
  },
]);
