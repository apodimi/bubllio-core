import { BrowserRouter, Route, Routes } from "react-router";

import { useAuth } from "@/features/auth";
import { SetupPage, SetupTasksPage, type SetupStatus } from "@/features/setup";
import { WorkspacePage } from "@/features/workspace";
import { PeoplePage } from "@/features/people";
import { paths } from "./paths";

export { paths } from "./paths";

function ActivePage(props: { status: SetupStatus; people?: boolean }) {
  const { status, people = false } = props;
  const { authenticated } = useAuth();

  if (!status.setupRequired) {
    return people ? <PeoplePage /> : <WorkspacePage />;
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
        <Route
          path={paths.people}
          element={<ActivePage status={status} people />}
        />
        <Route path="*" element={page} />
      </Routes>
    </BrowserRouter>
  );
}
