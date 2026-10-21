import { Icon, type IconifyIcon } from "@iconify/react";

export function AppIcon(props: { icon: IconifyIcon; size?: number }) {
  return (
    <Icon
      aria-hidden
      icon={props.icon}
      width={props.size ?? 20}
      height={props.size ?? 20}
    />
  );
}
