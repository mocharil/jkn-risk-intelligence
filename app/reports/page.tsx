"use client";

import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { InvestigationQueueInner } from "@/components/workspace/InvestigationWorkspace";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <PageLoader label="Memuat register dosier & berita acara audit..." />
        </DashboardShell>
      }
    >
      <InvestigationQueueInner defaultWorkspaceMode="QUEUE" />
    </Suspense>
  );
}
