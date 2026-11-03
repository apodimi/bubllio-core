import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
} from "@mui/material";

import type { CatalogApp } from "../schemas/people.schema";

interface AppAccessChoicesProps {
  apps: CatalogApp[];
  selected: string[];
  onChange: (keys: string[]) => void;
  label: string;
  emptyLabel: string;
  unavailableLabel: string;
}

export function AppAccessChoices(props: AppAccessChoicesProps) {
  const { apps, selected, onChange, label, emptyLabel, unavailableLabel } =
    props;

  function toggle(key: string, checked: boolean) {
    onChange(
      checked ? [...selected, key] : selected.filter((item) => item !== key),
    );
  }

  return (
    <FormGroup aria-label={label}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {apps.length === 0 && (
        <Typography color="text.secondary">{emptyLabel}</Typography>
      )}
      {apps.map((app) => (
        <FormControlLabel
          key={app.key}
          label={
            app.selectable
              ? app.displayName
              : `${app.displayName} · ${unavailableLabel}`
          }
          control={
            <Checkbox
              checked={selected.includes(app.key)}
              disabled={!app.selectable && !selected.includes(app.key)}
              onChange={(_, checked) => toggle(app.key, checked)}
            />
          }
        />
      ))}
    </FormGroup>
  );
}
