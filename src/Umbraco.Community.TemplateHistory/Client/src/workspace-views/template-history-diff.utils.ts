export type ParsedDiffLine = {
  type: "added" | "removed" | "context";
  content: string;
};

export type SideBySideDiffRow = {
  leftLineNumber?: number;
  rightLineNumber?: number;
  left?: { type: ParsedDiffLine["type"]; content: string };
  right?: { type: ParsedDiffLine["type"]; content: string };
};

export const CURRENT_VERSION_VALUE = "__current__";

export function parseUnifiedDiffText(diffText: string): ParsedDiffLine[] {
  if (!diffText.trim()) {
    return [];
  }

  return diffText.split(/\r?\n/).map((line) => {
    const marker = line.charAt(0);
    const content = line.slice(1);

    if (marker === "+") {
      return { type: "added" as const, content };
    }

    if (marker === "-") {
      return { type: "removed" as const, content };
    }

    return {
      type: "context" as const,
      content: line.startsWith(" ") ? content : line,
    };
  });
}

export function buildSideBySideRows(lines: ParsedDiffLine[]): SideBySideDiffRow[] {
  const rows: SideBySideDiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const next = lines[index + 1];

    if (line.type === "removed" && next?.type === "added") {
      rows.push({
        leftLineNumber: oldLine++,
        rightLineNumber: newLine++,
        left: { type: "removed", content: line.content },
        right: { type: "added", content: next.content },
      });
      index += 2;
      continue;
    }

    if (line.type === "removed") {
      rows.push({
        leftLineNumber: oldLine++,
        left: { type: "removed", content: line.content },
      });
      index++;
      continue;
    }

    if (line.type === "added") {
      rows.push({
        rightLineNumber: newLine++,
        right: { type: "added", content: line.content },
      });
      index++;
      continue;
    }

    rows.push({
      leftLineNumber: oldLine++,
      rightLineNumber: newLine++,
      left: { type: "context", content: line.content },
      right: { type: "context", content: line.content },
    });
    index++;
  }

  return rows;
}

export function buildUnifiedRows(lines: ParsedDiffLine[]): Array<{
  lineNumber?: number;
  type: ParsedDiffLine["type"];
  content: string;
}> {
  const rows: Array<{ lineNumber?: number; type: ParsedDiffLine["type"]; content: string }> = [];
  let oldLine = 1;
  let newLine = 1;

  for (const line of lines) {
    if (line.type === "removed") {
      rows.push({ lineNumber: oldLine++, type: line.type, content: line.content });
      continue;
    }

    if (line.type === "added") {
      rows.push({ lineNumber: newLine++, type: line.type, content: line.content });
      continue;
    }

    rows.push({ lineNumber: oldLine++, type: line.type, content: line.content });
    newLine++;
  }

  return rows;
}
