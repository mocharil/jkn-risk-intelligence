"use client";

import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { InvestigationQueueInner } from "@/components/workspace/InvestigationWorkspace";

export default function InvestigationQueuePage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <PageLoader label="Memuat ruang kerja pemeriksaan klaim..." />
        </DashboardShell>
      }
    >
      <InvestigationQueueInner defaultWorkspaceMode="QUEUE" />
    </Suspense>
  );
}
