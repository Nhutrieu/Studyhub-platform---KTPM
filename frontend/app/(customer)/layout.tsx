import { ReactNode } from "react";
import AppShell from "@/components/layouts/AppShell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

