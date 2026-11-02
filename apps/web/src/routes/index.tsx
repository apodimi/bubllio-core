import { BrowserRouter, Route, Routes } from "react-router";

import { useAuth } from "@/features/auth";
import { SetupPage, SetupTasksPage, type SetupStatus } from "@/features/setup";
import { WorkspacePage } from "@/features/workspace";
import { paths } from "./paths";

export { paths } from "./paths";

function ActivePage(props: { status: SetupStatus }) {
  const { status } = props;
  const { authenticated } = useAuth();

  if (!status.setupRequired) {
    return <WorkspacePage />;
  }

  if (authenticated) {
    return <SetupTasksPage />;
  }

  return <SetupPage />;
}

export function AppRoutes(props: { status: SetupStatus }) {
  const { status } = props;
  const page = <ActivePage status={status} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path={paths.home} element={page} />
        <Route path={paths.setup} element={page} />
        <Route path="*" element={page} />
      </Routes>
    </BrowserRouter>
  );
}
