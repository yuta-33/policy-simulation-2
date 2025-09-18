import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type RecordItem = {
  id: string;
  createdAt: string;
  name: string;
  purpose: string;
  summary: string;
  budgetK: number;
  kpis: {
    proposedBudgetK: number;
    similarAvgBudgetK: number;
    budgetGapK: number;
    similarCount: number;
  };
  status: 'A'|'B'|'C'|'D'|'mixed';
};

const filePath = path.join(process.cwd(), "data", "history.json");

async function readAll(): Promise<RecordItem[]> {
  try {
    const txt = await fs.readFile(filePath, "utf-8");
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

async function writeAll(items: RecordItem[]) {
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

  const all = await readAll();
  let filtered = all;
  if (status && status !== "all") {
    filtered = filtered.filter(i => i.status === status || (status === "mixed" && i.status === "mixed"));
  }
  if (from) {
    filtered = filtered.filter(i => i.createdAt >= from);
  }
  if (to) {
    filtered = filtered.filter(i => i.createdAt <= to);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return NextResponse.json({ total, page, pageSize, items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const record = { id, createdAt, ...body };
    const all = await readAll();
    all.unshift(record);
    await writeAll(all);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
