"use client";

import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { InvestigationQueueInner } from "@/components/workspace/InvestigationWorkspace";

export default function ClaimsIntelligencePage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <PageLoader label="Memuat sensus repositori klaim..." />
        </DashboardShell>
      }
    >
      <InvestigationQueueInner defaultWorkspaceMode="CLAIMS" />
    </Suspense>
  );
}
