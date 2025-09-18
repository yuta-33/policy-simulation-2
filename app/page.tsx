'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, NotebookPen, Loader2, Info, History, Download, SlidersHorizontal, ExternalLink } from 'lucide-react';
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
function pct(n:number){ return (n*100).toFixed(1) + '%'; }

function KPICard({title, value, foot}:{title:string; value:string; foot?:string}){
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {foot && <div className="text-xs text-slate-500 mt-1">{foot}</div>}
    </div>
  );
}

export default function Page(){
  const [purpose, setPurpose] = useState('地域課題の解決（例：独居高齢者の見守り強化）');
  const [summary, setSummary] = useState('センサー設置と見守りプラットフォームの構築、相談窓口の拡充');
  const [budgetK, setBudgetK] = useState<number>(50000);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [weight_sum, setWeightSum] = useState(0.6);
  const [weight_ass, setWeightAss] = useState(0.4);
  const [topK, setTopK] = useState(8);
  const [tau, setTau] = useState(0.07);

  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs|null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [selected, setSelected] = useState<Neighbor|null>(null);
  const { push } = useToast();

  // Local history in browser (downloadable)
  const [history, setHistory] = useState<any[]>([]);
  useEffect(()=>{
    const h = localStorage.getItem('history');
    if (h) setHistory(JSON.parse(h));
  }, []);

  function saveHistory(entry:any){
    const arr = [entry, ...history].slice(0, 200);
    setHistory(arr);
    localStorage.setItem('history', JSON.stringify(arr));
  }

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

      saveHistory({
        at: new Date().toISOString(),
        input: { purpose, summary, budgetK, params: { weight_sum, weight_ass, topK, tau } },
        output: data
      });

      push('分析完了');
    } catch (e:any) {
      console.error(e);
      push('分析に失敗しました: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }

  function downloadHistory(){
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'history.json'; a.click();
    URL.revokeObjectURL(url);
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
      <main className="container py-8 space-y-6">
        <header className="text-center">
          <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight">政策立案 予算シミュレーション</motion.h1>
          <p className="text-slate-600 mt-2">OpenAI埋め込み + Top-K 重み付き対数平均で推定</p>
        </header>

        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label">現状・目的（課題）</label>
                <textarea className="input h-24" value={purpose} onChange={e=> setPurpose(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="label">事業概要（施策）</label>
                <textarea className="input h-24" value={summary} onChange={e=> setSummary(e.target.value)} />
              </div>
              <div>
                <label className="label">提案予算（千円）</label>
                <input className="input" type="number" min={0} value={budgetK} onChange={e=> setBudgetK(Number(e.target.value||0))} />
              </div>
              <div>
                <label className="label">パラメータ</label><br/>
                <button className="btn" onClick={()=> setParamsOpen(true)}><SlidersHorizontal size={16} className="inline mr-1" /> 調整</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={analyze}>
                <Search size={16} className="inline mr-1" /> 分析する
              </button>
              <button className="btn" onClick={()=> {
                navigator.clipboard.writeText(JSON.stringify({ purpose, summary, budgetK }, null, 2));
              }}>
                <NotebookPen size={16} className="inline mr-1" /> 入力をコピー
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <KPICard title="推定予算（千円）" value={kpis ? numberK(kpis.estimatedBudgetK) : '—'} />
              <KPICard title="類似事業件数（Top-K）" value={kpis ? String(kpis.neighborsCount) : '—'}
                foot={kpis ? `K=${kpis.topK}` : undefined} />
              <KPICard title="比較（差額・千円）" value={diffInfo ? numberK(diffInfo.diffK) : '—'}
                foot={diffInfo ? `提案との差：${diffInfo.pct.toFixed(1)}%` : undefined} />
              <KPICard title="重みと温度" value={kpis ? `sum:${kpis.weight_sum} / ass:${kpis.weight_ass}` : '—'}
                foot={kpis ? `tau=${kpis.tau}` : undefined} />
            </div>
            <div className="card p-4 flex gap-2 items-center">
              <Info size={16} className="text-slate-500" />
              <p className="text-sm text-slate-600">CSV（7MB程度）をServerless起動時に読み込みます。初回アクセスは少し時間がかかる場合があります。</p>
            </div>
            <div className="card p-3">
              <button className="btn w-full" onClick={downloadHistory}>
                <Download size={16} className="inline mr-1" /> 履歴をダウンロード（JSON）
              </button>
            </div>
          </div>
        </section>

        <section className="card p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="animate-spin" size={18} /> 分析中...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">事業名 / 府省庁</th>
                    <th className="py-2">予算（円）</th>
                    <th className="py-2">score</th>
                    <th className="py-2">概要</th>
                    <th className="py-2 text-right">リンク</th>
                  </tr>
                </thead>
                <tbody>
                  {neighbors.map((n, i)=> (
                    <tr key={n.id + '_' + i} className="hover:bg-white/60">
                      <td className="py-2">
                        <div className="font-medium">{n.title}</div>
                        <div className="text-xs text-slate-500">{n.ministry} / {n.bureau}</div>
                      </td>
                      <td className="py-2">{numberYen(n.budgetYen)} 円</td>
                      <td className="py-2">{n.score.toFixed(3)} <span className="text-xs text-slate-500">(w:{n.weight.toFixed(3)})</span></td>
                      <td className="py-2 line-clamp-2">{n.summary}</td>
                      <td className="py-2 text-right">
                        {n.url ? <a className="btn" href={n.url} target="_blank" rel="noreferrer">開く <ExternalLink size={14} className="inline ml-1" /></a> : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                  {neighbors.length === 0 && (
                    <tr><td className="py-6 text-slate-500" colSpan={5}>結果はまだありません。入力して「分析する」を押してください。</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
      </main>
    </ToastProvider>
  );
}
