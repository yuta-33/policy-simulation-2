import { NextRequest, NextResponse } from "next/server";
import { getClient, EMBEDDING_MODEL } from "@/lib/openai";
import { loadDataset } from "@/lib/data";
import { dot, normalize, softmax, logWeightedMean } from "@/lib/math";

export const maxDuration = 30; // Vercel serverless limit

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purpose, summary, budgetK } = body || {};
    if (!purpose || !summary) {
      return NextResponse.json(
        { error: "purpose と summary は必須です", errorStage: "input-validation" },
        { status: 400 }
      );
    }

    const weight_sum = Number(body.params?.weight_sum ?? process.env.WEIGHT_SUM ?? 0.6);
    const weight_ass = Number(body.params?.weight_ass ?? process.env.WEIGHT_ASS ?? 0.4);
    const topK = Math.max(1, Math.floor(Number(body.params?.topK ?? process.env.TOPK ?? 8)));
    const tau = Number(body.params?.tau ?? process.env.TAU ?? 0.07);

    let q_sum: Float32Array, q_ass: Float32Array;
    try {
      const openai = getClient();
      const [e1, e2] = await Promise.all([
        openai.embeddings.create({ model: EMBEDDING_MODEL, input: summary }),
        openai.embeddings.create({ model: EMBEDDING_MODEL, input: purpose }),
      ]);
      q_sum = normalize(new Float32Array(e1.data[0].embedding as number[]));
      q_ass = normalize(new Float32Array(e2.data[0].embedding as number[]));
    } catch (e: any) {
      console.error("[ERROR] Embedding API failed:", e);
      return NextResponse.json(
        { error: "Embedding API failed", errorStage: "embedding", detail: e.message },
        { status: 500 }
      );
    }

    let rows;
    try {
      rows = await loadDataset();
    } catch (e: any) {
      console.error("[ERROR] Dataset load failed:", e);
      return NextResponse.json(
        { error: "Dataset load failed", errorStage: "dataset", detail: e.message },
        { status: 500 }
      );
    }

    let neighbors: any[] = [];
    let estYen = 0;
    try {
      const scores: { idx: number; s_sum: number; s_ass: number; s: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.vec_sum || !r.vec_ass) continue; // 欠損は除外
        const s1 = dot(q_sum, normalize(r.vec_sum));
        const s2 = dot(q_ass, normalize(r.vec_ass));
        const s = weight_sum * s1 + weight_ass * s2;
        scores.push({ idx: i, s_sum: s1, s_ass: s2, s });
      }

      if (scores.length === 0) {
        console.error("[ERROR] No valid rows with embeddings");
        return NextResponse.json(
          { error: "有効な埋め込みベクトルを持つデータが存在しません", errorStage: "similarity" },
          { status: 500 }
        );
      }

      scores.sort((a, b) => b.s - a.s);
      const top = scores.slice(0, topK);
      const sims = top.map(t => t.s);
      const weights = softmax(sims, tau);
      const budgets = top.map(t => rows[t.idx].budgetYen);
      estYen = logWeightedMean(budgets, weights);

      neighbors = top.map((t, i) => {
        const r = rows[t.idx];
        return {
          id: r.id,
          ministry: r.ministry,
          bureau: r.bureau,
          title: r.title,
          url: r.url,
          summary: r.summary,
          purpose: r.purpose,
          budgetYen: r.budgetYen,
          score: t.s,
          s_sum: t.s_sum,
          s_ass: t.s_ass,
          weight: weights[i],
        };
      });
    } catch (e: any) {
      console.error("[ERROR] Similarity calculation failed:", e);
      return NextResponse.json(
        { error: "Similarity calculation failed", errorStage: "similarity", detail: e.message },
        { status: 500 }
      );
    }

    const kpis = {
      estimatedBudgetK: Math.round(estYen / 1000),
      neighborsCount: neighbors.length,
      topK,
      tau,
      weight_sum,
      weight_ass,
    };

    let shortReport = "";
    if (typeof budgetK === "number") {
      const diff = budgetK * 1000 - estYen;
      const diffPct = (diff / estYen) * 100;
      const count = neighbors.length;

      if (Math.abs(diffPct) < 10) {
        shortReport = `提案額は推定額に比して概ね妥当であり、類似事業 ${count} 件を参照しても整合的です。今後は予算根拠の明示により、更なる評価向上が期待されます。`;
      } else if (diffPct > 0) {
        shortReport = `提案額は推定額に比して約+${diffPct.toFixed(
          1
        )}% 高めに設定されています。類似事業 ${count} 件の水準と比較し、人件費・委託費の内訳を精査し費用対効果を再確認することが適当です。`;
      } else {
        shortReport = `提案額は推定額に比して約${diffPct.toFixed(
          1
        )}% 低く設定されています。類似事業 ${count} 件の水準を踏まえ、必要人員や維持管理費の算入漏れがないか点検することが望まれます。`;
      }
    }

    return NextResponse.json({ kpis, neighbors, shortReport });
  } catch (e: any) {
    console.error("[ERROR] Unexpected failure:", e);
    return NextResponse.json(
      { error: "Unexpected server error", errorStage: "unexpected", detail: e.message },
      { status: 500 }
    );
  }
}
