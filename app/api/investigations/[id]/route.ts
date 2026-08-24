import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";
import { InvestigationNote } from "@/types/investigation";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invId = params.id;
  const investigation = await DatabaseService.getInvestigationById(invId);

  if (!investigation) {
    return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
  }

  return NextResponse.json({ data: investigation });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invId = params.id;
  const body = await request.json();
  const { status, note, determination, action } = body;

  let noteObj: InvestigationNote | undefined = undefined;
  if (note) {
    noteObj = {
      note_id: `NOTE-${Date.now()}`,
      author: typeof note === "object" && note.author ? note.author : "Auditor JKN",
      role: typeof note === "object" && note.role ? note.role : "Senior Investigator",
      content: typeof note === "string" ? note : note.content || "",
      created_at: new Date().toISOString(),
      type: "USER_NOTE",
    };
  }

  const updated = await DatabaseService.updateInvestigation(invId, {
    status,
    determination,
    notes: noteObj,
    audit_action: action || (status ? `STATUS_CHANGED_TO_${status}` : "NOTE_ADDED"),
  });

  if (!updated) {
    return NextResponse.json({ error: "Failed to update investigation" }, { status: 400 });
  }

  return NextResponse.json({ data: updated });
}
