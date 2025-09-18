'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, NotebookPen, Loader2, Info, Download, SlidersHorizontal, ExternalLink } from 'lucide-react';
import Modal from '@/components/Modal';
import { ToastProvider, useToast } from '@/components/Toast';

type KPIs = {
  estimatedBudgetK: number;
  neighborsCount: number;
  topK: number;
  tau: number;
  weight_sum: number;
  weight_ass: number;
}
type Neighbor = {
  id: string;
  ministry: string;
  bureau: string;
  title: string;
  url?: string;
  summary: string;
  purpose: string;
  budgetYen: number;
  score: number;
  s_sum: number;
  s_ass: number;
  weight: number;
}

type AnalyzeRes = { kpis: KPIs; neighbors: Neighbor[]; suggestions?: string[] };

function numberK(n:number){ return n.toLocaleString('ja-JP'); }
function numberYen(n:number){ return n.toLocaleString('ja-JP'); }

function KPICard({title, value, foot, status}:{title:string; value:string; foot?:string; status?:'pos'|'neg'}) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`text-2xl font-bold ${status==='pos' ? 'text-green-600' : status==='neg' ? 'text-red-600' : 'text-slate-800'}`}>
        {value}
      </div>
      {foot && <div className="text-xs text-slate-500 mt-1">{foot}</div>}
    </div>
  );
}

export default function Page(){
  const [purpose, setPurpose] = useState('');
  const [summary, setSummary] = useState('');
  const [budgetK, setBudgetK] = useState<number>(50000);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [weight_sum, setWeightSum] = useState(0.6);
  const [weight_ass, setWeightAss] = useState(0.4);
  const [topK, setTopK] = useState(8);
  const [tau, setTau] = useState(0.07);

  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs|null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const { push } = useToast();

  async function analyze(){
    try {
      setLoading(true);
      const res = await fetch('/api/analyze', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          name: '提案案件',
          purpose,
          summary,
          budgetK,
          params: { weight_sum, weight_ass, topK, tau }
        })
      });
      const data: AnalyzeRes | {error:string} = await res.json();
      if ('error' in data) throw new Error(data.error);
      setKpis(data.kpis);
      setNeighbors(data.neighbors);
      push('分析完了');
    } catch (e:any) {
      console.error(e);
      push('分析に失敗しました: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }

  const diffInfo = useMemo(()=>{
    if (!kpis) return null;
    const est = kpis.estimatedBudgetK;
    const diffK = budgetK - est;
    const pct = ((budgetK*1000 - est*1000) / (est*1000)) * 100;
    return { est, diffK, pct };
  }, [kpis, budgetK]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F8F9FA]">
        {/* ヘッダー */}
        <header className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-700 shadow text-white">
          <h1 className="text-xl font-bold">政策立案予算シミュレーション</h1>
          <div className="space-x-2">
            <button className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white">+ 新規作成</button>
            <button className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white">保存</button>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-slate-700">データ出力</button>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* KPIカード */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard title="推定予算（千円）" value={kpis ? numberK(kpis.estimatedBudgetK) : '—'} />
            <KPICard title="類似事業件数" value={kpis ? String(kpis.neighborsCount) : '—'} foot={kpis ? `K=${kpis.topK}` : undefined} />
            <KPICard title="比較（差額・千円）" value={diffInfo ? numberK(diffInfo.diffK) : '—'} foot={diffInfo ? `差：${diffInfo.pct.toFixed(1)}%` : undefined} status={diffInfo ? (diffInfo.diffK >= 0 ? 'pos' : 'neg') : undefined} />
            <KPICard title="重みと温度" value={kpis ? `sum:${kpis.weight_sum} / ass:${kpis.weight_ass}` : '—'} foot={kpis ? `tau=${kpis.tau}` : undefined} />
          </div>

          {/* 2カラム */}
          <div className="grid grid-cols-2 gap-6">
            {/* 左: 入力フォーム */}
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">現状・目的（課題）</label>
              <textarea className="input h-24" value={purpose} onChange={e=> setPurpose(e.target.value)} />

              <label className="block text-sm font-medium text-slate-700">事業概要（施策）</label>
              <textarea className="input h-24" value={summary} onChange={e=> setSummary(e.target.value)} />

              <label className="block text-sm font-medium text-slate-700">提案予算（千円）</label>
              <input className="input" type="number" min={0} value={budgetK} onChange={e=> setBudgetK(Number(e.target.value||0))} />

              <button className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={analyze}>
                <Search size={16} className="inline mr-1" /> 分析する
              </button>
            </div>

            {/* 右: 補助情報 */}
            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow p-4 flex gap-2 items-center">
                <Info size={16} className="text-indigo-500" />
                <p className="text-sm text-slate-600">CSV（7MB程度）をServerless起動時に読み込みます。初回アクセスは少し時間がかかる場合があります。</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-4">
                <button className="btn w-full bg-gray-200 hover:bg-gray-300 text-slate-700">
                  <Download size={16} className="inline mr-1" /> 履歴をダウンロード（準備中）
                </button>
              </div>
            </div>
          </div>

          {/* 分析結果テーブル */}
          <section className="bg-white rounded-2xl shadow p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-700">
                <Loader2 className="animate-spin text-indigo-500" size={18} /> 分析中...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2 px-2">事業名 / 府省庁</th>
                      <th className="py-2 px-2">予算（円）</th>
                      <th className="py-2 px-2">score</th>
                      <th className="py-2 px-2">概要</th>
                      <th className="py-2 px-2 text-right">リンク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighbors.map((n, i)=> (
                      <tr key={n.id + '_' + i} className="hover:bg-slate-100">
                        <td className="py-2 px-2">
                          <div className="font-medium text-slate-800">{n.title}</div>
                          <div className="text-xs text-slate-500">{n.ministry} / {n.bureau}</div>
                        </td>
                        <td className="py-2 px-2">{numberYen(n.budgetYen)} 円</td>
                        <td className="py-2 px-2">{n.score.toFixed(3)} <span className="text-xs text-slate-500">(w:{n.weight.toFixed(3)})</span></td>
                        <td className="py-2 px-2 line-clamp-2 text-slate-700">{n.summary}</td>
                        <td className="py-2 px-2 text-right">
                          {n.url ? <a className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100" href={n.url} target="_blank" rel="noreferrer">開く <ExternalLink size={14} className="inline ml-1" /></a> : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {neighbors.length === 0 && (
                      <tr><td className="py-6 text-slate-500" colSpan={5}>結果はまだありません。</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* パラメータ調整モーダル */}
      <Modal open={paramsOpen} onClose={()=> setParamsOpen(false)} title="検索パラメータ">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="label">weight_sum（概要）</label>
          <input className="input" type="number" step="0.1" value={weight_sum}
            onChange={e=> setWeightSum(Number(e.target.value))} />
          <label className="label">weight_ass（目的）</label>
          <input className="input" type="number" step="0.1" value={weight_ass}
            onChange={e=> setWeightAss(Number(e.target.value))} />
          <label className="label">Top-K</label>
          <input className="input" type="number" step="1" value={topK}
            onChange={e=> setTopK(Number(e.target.value))} />
          <label className="label">tau</label>
          <input className="input" type="number" step="0.01" value={tau}
            onChange={e=> setTau(Number(e.target.value))} />
        </div>
      </Modal>
    </ToastProvider>
  );
}
