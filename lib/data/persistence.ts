import fs from "fs";
import path from "path";
import { dataDir } from "./paths";
import { AuditEntry } from "../audit/chain";
import { UserRecord } from "../auth/types";
import { CanonicalClaim, ClaimStatus } from "@/types/claim";
import { Dataset } from "@/types/dataset";
import { Investigation } from "@/types/investigation";

/**
 * Snapshot ringan ke .data/arsa-state.json: hanya state yang diubah pengguna / hasil ingest.
 * Data sintetis bawaan dibangkitkan ulang secara deterministik pada tiap boot.
 */
export interface PersistedState {
  version: 1;
  datasets: Dataset[];
  ingested_claims: CanonicalClaim[];
  investigation_overrides: Record<string, Pick<Investigation, "status" | "notes" | "decision" | "assigned_to" | "updated_at">>;
  claim_status: Record<string, ClaimStatus>;
  audit_log: AuditEntry[];
  users: UserRecord[];
}

const file = () => path.join(dataDir(), "arsa-state.json");

export function loadState(): PersistedState | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file(), "utf8"));
    return parsed?.version === 1 ? (parsed as PersistedState) : null;
  } catch {
    return null;
  }
}

let timer: NodeJS.Timeout | null = null;
export function scheduleSave(snapshot: () => PersistedState) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      fs.mkdirSync(path.dirname(file()), { recursive: true });
      fs.writeFileSync(file(), JSON.stringify(snapshot()));
    } catch {
      /* filesystem tidak dapat ditulis (mis. serverless) → state hanya di memori */
    }
  }, 250);
}

export function deleteState() {
  try {
    fs.rmSync(file(), { force: true });
  } catch {
    /* ignore */
  }
}
