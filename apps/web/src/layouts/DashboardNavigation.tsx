import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { Link, useLocation } from "react-router";

import { BrandLogo } from "@/components";

export interface DashboardNavigationGroup {
  label: string;
  items: { label: string; to: string }[];
}

interface DashboardNavigationProps {
  closeLabel?: string;
  contextName?: string;
  groups: DashboardNavigationGroup[];
  navigationLabel: string;
  onNavigate?: () => void;
}

export function DashboardNavigation(props: DashboardNavigationProps) {
  const { closeLabel, contextName, groups, navigationLabel, onNavigate } =
    props;
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {closeLabel && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button color="inherit" size="small" onClick={onNavigate}>
            {closeLabel}
          </Button>
        </Box>
      )}
      <BrandLogo />

      {contextName && (
        <Typography
          variant="body2"
          sx={{ mt: 4, px: 1.5, fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {contextName}
        </Typography>
      )}

      <Box
        component="nav"
        aria-label={navigationLabel}
        sx={{ mt: contextName ? 3 : 5 }}
      >
        {groups.map((group) => (
          <Box key={group.label} sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: 1.5, mb: 0.75, fontWeight: 700 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const selected = pathname === item.to.split("?")[0];

                return (
                  <ListItemButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    selected={selected}
                    aria-current={selected ? "page" : undefined}
                    onClick={onNavigate}
                    sx={{
                      minHeight: 44,
                      px: 1.5,
                      borderRadius: 1,
                      color: selected ? "primary.main" : "text.primary",
                      "&.Mui-selected": { bgcolor: "action.selected" },
                    }}
                  >
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          sx: { fontWeight: selected ? 700 : 500 },
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
