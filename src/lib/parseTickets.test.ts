import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTicketMarkdown } from "./parseTickets";

describe("parseTicketMarkdown", () => {
  it("parses garcia sample file", () => {
    const path = join(process.cwd(), "garcia-tasks", "Garcia_PA_Phase1_Tickets.md");
    const md = readFileSync(path, "utf8");
    const { tasks, warnings } = parseTicketMarkdown(md);
    assert.equal(warnings.length, 0);
    assert.equal(tasks.length, 7);
    assert.equal(tasks[0].ticketNumber, 1);
    assert.ok(tasks[0].title.includes("SFTP"));
    assert.ok(tasks[1].userStory.includes("System"));
    assert.ok(tasks[3].acceptanceCriteria.includes("JSON"));
  });

  it("handles empty input", () => {
    const { tasks, warnings } = parseTicketMarkdown("   ");
    assert.equal(tasks.length, 0);
    assert.ok(warnings.some((w) => w.includes("Empty")));
  });
});
