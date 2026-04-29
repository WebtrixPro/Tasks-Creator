import { createHash } from "node:crypto";

export type ParsedTask = {
  ticketNumber: number;
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string;
  estimate: string;
  priority: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type ParseResult = {
  tasks: ParsedTask[];
  warnings: string[];
};

function fieldValue(line: string): { name: string; value: string } | null {
  const m = line.match(/^\*\s*\*\*(.+?):\*\*\s*(.*)$/);
  if (!m) return null;
  return { name: m[1].trim(), value: m[2].trim() };
}

/**
 * Parse date strings like "Mon, Apr 27" or "Tue, May 05"
 * Returns a Date object or null if parsing fails
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  
  // Match patterns like "Mon, Apr 27" or "Apr 27" or "April 27"
  const match = dateStr.match(/(?:\w+,\s*)?(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
  if (!match) return null;
  
  const monthStr = match[1].slice(0, 3); // Take first 3 chars for month abbreviation
  const monthKey = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
  const month = months[monthKey];
  
  if (month === undefined) return null;
  
  const day = parseInt(match[2], 10);
  const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
  
  const date = new Date(year, month, day);
  
  // Validate the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
}

function parseBlock(block: string, warnings: string[]): ParsedTask | null {
  const lines = block.split(/\r?\n/).map((l) => l.trimEnd());
  const ticketLine = lines.find((l) => /^\*\*Ticket\s+\d+:/i.test(l));
  if (!ticketLine) return null;
  const tm = ticketLine.match(/^\*\*Ticket\s+(\d+)\s*:/i);
  if (!tm) return null;
  const ticketNumber = parseInt(tm[1], 10);

  const fields: Record<string, string> = {};
  let currentField: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^\*\*Ticket\s+\d+:/i.test(line)) continue;

    const fv = fieldValue(line);
    if (fv) {
      currentField = fv.name;
      fields[currentField] = fv.value;
      continue;
    }

    if (currentField && (line.startsWith("*") || line.startsWith("  *"))) {
      const stripped = line.replace(/^\s*\*\s*/, "").trim();
      fields[currentField] = (fields[currentField] ? `${fields[currentField]}\n` : "") + stripped;
    }
  }

  const title = fields["Title"] ?? "";
  if (!title) warnings.push(`Ticket ${ticketNumber}: missing Title`);

  return {
    ticketNumber,
    title,
    userStory: fields["User Story"] ?? "",
    description: fields["Description"] ?? "",
    acceptanceCriteria: fields["Acceptance Criteria"] ?? "",
    estimate: fields["Estimate"] ?? "",
    priority: fields["Priority"] ?? "",
    startDate: parseDateString(fields["Start Date"] ?? ""),
    endDate: parseDateString(fields["End Date"] ?? ""),
  };
}

export function parseTicketMarkdown(markdown: string): ParseResult {
  const warnings: string[] = [];
  const trimmed = markdown.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    warnings.push("Empty markdown");
    return { tasks: [], warnings };
  }

  const chunks = trimmed.split(/\n###\s*---\s*\n|\n###\s*---\s*$/i);
  const tasks: ParsedTask[] = [];

  for (const chunk of chunks) {
    const block = chunk.trim();
    if (!block) continue;
    const task = parseBlock(block, warnings);
    if (task) tasks.push(task);
  }

  tasks.sort((a, b) => a.ticketNumber - b.ticketNumber);

  const seen = new Set<number>();
  for (const t of tasks) {
    if (seen.has(t.ticketNumber)) warnings.push(`Duplicate ticket number ${t.ticketNumber} in file`);
    seen.add(t.ticketNumber);
  }

  return { tasks, warnings };
}

export function hashMarkdown(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
