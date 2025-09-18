export type Project = {
  id: string;
  name: string;
  purpose: string;
  summary: string;
  budgetK: number;
  rating: 'A'|'B'|'C'|'D';
  department: string;
  year: number;
};

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function termFreq(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const total = tokens.length || 1;
  Object.keys(tf).forEach(k => tf[k] /= total);
  return tf;
}

export function cosine(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach(k => {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  });
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function budgetSimilarity(aK: number, bK: number): number {
  if (!aK || !bK) return 0;
  const diff = Math.abs(aK - bK);
  const max = Math.max(aK, bK);
  return Math.max(0, 1 - diff / (max || 1));
}

export function scoreSimilarity(input: {purpose:string; name:string; summary:string; budgetK:number}, candidates: Project[]) {
  const tokens = tokenize([input.purpose, input.name, input.summary].join(' '));
  const tf = termFreq(tokens);
  return candidates.map(p => {
    const t = tokenize([p.purpose, p.name, p.summary].join(' '));
    const tfp = termFreq(t);
    const textSim = cosine(tf, tfp);
    const budgetSim = budgetSimilarity(input.budgetK, p.budgetK);
    const final = 0.7 * textSim + 0.3 * budgetSim;
    return { project: p, textSim, budgetSim, final };
  }).sort((a,b)=> b.final - a.final);
}

export function ratingBucket(r: Project['rating']): 'high'|'needs' {
  return (r === 'A' || r === 'B') ? 'high' : 'needs';
}
