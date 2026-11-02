import { useEffect, useRef, type ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

import type { SetupCopy } from "../../../../locales";

export type TaskState = "complete" | "current" | "pending";
export type TaskKey = keyof SetupCopy["tasks"];

interface SetupTaskProps {
  children?: ReactNode;
  focus: boolean;
  state: TaskState;
  statusLabel: string;
  title: string;
}

export function SetupTask(props: SetupTaskProps) {
  const { children, focus, state, statusLabel, title } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focus) {
      headingRef.current?.focus();
    }
  }, [focus]);

  return (
    <Box
      component="li"
      aria-current={state === "current" ? "step" : undefined}
      sx={{
        py: { xs: 2.5, sm: 3 },
        borderTop: "1px solid",
        borderColor: "divider",
        opacity: state === "pending" ? 0.62 : 1,
        "&:last-child": { borderBottom: "1px solid", borderColor: "divider" },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.5, sm: 2 }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "baseline" } }}
      >
        <Typography
          ref={headingRef}
          tabIndex={focus ? -1 : undefined}
          variant="h5"
          component="h2"
          sx={{ "&:focus": { outline: "none" } }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color={state === "current" ? "primary.main" : "text.secondary"}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        >
          {statusLabel}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}
