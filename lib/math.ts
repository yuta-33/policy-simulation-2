export function l2norm(x: Float32Array): number {
  let s = 0; for (let i=0;i<x.length;i++) s += x[i]*x[i]; return Math.sqrt(s);
}
export function normalize(x: Float32Array): Float32Array {
  const n = l2norm(x); if (n===0) return x.slice();
  const out = new Float32Array(x.length);
  for (let i=0;i<x.length;i++) out[i] = x[i]/n;
  return out;
}
export function dot(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0; for (let i=0;i<n;i++) s += a[i]*b[i]; return s;
}
export function softmax(x: number[], tau: number): number[] {
  const t = Math.max(1e-6, tau);
  const m = Math.max(...x);
  const exps = x.map(v => Math.exp((v - m) / t));
  const sum = exps.reduce((a,b)=>a+b, 0) || 1;
  return exps.map(v => v/sum);
}
export function logWeightedMean(values: number[], weights: number[]): number {
  // exp( sum_i w_i * ln(value_i) )
  const eps = 1e-9;
  let s = 0;
  for (let i=0;i<values.length;i++) {
    const v = Math.max(eps, values[i]);
    s += weights[i] * Math.log(v);
  }
  return Math.exp(s);
}
