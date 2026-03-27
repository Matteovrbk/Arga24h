import { createBrowserRouter } from "react-router";
import { OperatorDashboard } from "./components/OperatorDashboard";
import { SpectatorView } from "./components/SpectatorView";
import { QueueView } from "./components/QueueView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SpectatorView,
  },
  {
    path: "/attente",
    Component: QueueView,
  },
  {
    path: "/admin",
    Component: OperatorDashboard,
  },
]);
