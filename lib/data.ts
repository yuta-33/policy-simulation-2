import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export type Row = {
  予算事業ID: string;
  府省庁: string;
  局・庁: string;
  事業名: string;
  事業概要: string;
  現状・課題: string;
  当初予算: string; // 円
  事業概要URL?: string;
  embedding_ass?: string; // JSON array string
  embedding_sum?: string; // JSON array string
};

export type VectorRow = {
  id: string;
  ministry: string;
  bureau: string;
  title: string;
  summary: string;
  purpose: string;
  url?: string;
  budgetYen: number;
  vec_sum: Float32Array | null;
  vec_ass: Float32Array | null;
};

let cache: { rows: VectorRow[] } | null = null;

function toVec(raw?: string | null): Float32Array | null {
  if (!raw) return null;
  const s = raw.trim();
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return new Float32Array(arr.map(Number));
  } catch {}
  // fallback: space/comma separated
  const parts = s.replace(/[\[\]]/g, '').split(/[\s,]+/).filter(Boolean).map(Number);
  if (!parts.length || parts.some(n => Number.isNaN(n))) return null;
  return new Float32Array(parts);
}

export async function loadDataset() {
  if (cache) return cache.rows;
  const file = path.join(process.cwd(), 'data', 'final_2024.csv');
  const csv = await fs.readFile(file, 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Row[];
  const rows: VectorRow[] = records.map(r => ({
    id: r['予算事業ID'],
    ministry: r['府省庁'],
    bureau: r['局・庁'],
    title: r['事業名'],
    summary: r['事業概要'],
    purpose: r['現状・課題'],
    url: r['事業概要URL'],
    budgetYen: Number(String(r['当初予算']).replace(/[,\s]/g, '')),
    vec_sum: toVec(r['embedding_sum']),
    vec_ass: toVec(r['embedding_ass']),
  }));
  cache = { rows };
  return rows;
}
