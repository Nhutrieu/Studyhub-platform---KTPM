"use client";

import { ReactNode } from "react";
import AppShellProtected from "@/components/layouts/AppShellProtected";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShellProtected>{children}</AppShellProtected>;
}

