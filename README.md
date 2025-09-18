# 政策立案 予算シミュレーション (Next.js)

行政改革学生アイデアソン向けプロトタイプ。**OpenAI Embeddings + CSV（final_2024.csv）**を使用。

## セットアップ

```bash
cp .env.example .env.local  # OPENAI_API_KEY を設定
npm install
npm run dev
# http://localhost:3000
```

- データは `data/final_2024.csv` を読み込みます（約7MB想定）。
- Vercel（Serverless）ではコールドスタート時に読み込みが走ります。

## 期待するCSVカラム
- 予算事業ID, 府省庁, 局・庁, 事業名, 事業概要, 現状・課題, 当初予算, 事業概要URL（任意）
- embedding_sum（事業概要の埋め込み 1536次元想定 / JSON配列文字列）
- embedding_ass（現状・課題の埋め込み 1536次元想定 / JSON配列文字列）

> 埋め込み列は `[0.01, 0.02, ...]` のような**JSON配列文字列**を推奨。そうでない場合も空白/カンマ区切りから復元を試みます。

## API: /api/analyze
- 入力: `purpose`（現状・課題）, `summary`（事業概要）, `budgetK`（任意, 千円）, `params`
- 実装: 
  1) OpenAI `text-embedding-3-small` で2テキストを埋め込み  
  2) L2正規化・内積で類似度（概要= S1, 目的= S2）  
  3) 合成 `S = weight_sum*S1 + weight_ass*S2`  
  4) Top-K抽出 → `tau` でsoftmax重み → **対数加重平均**で予算推定  
- 出力: `kpis.estimatedBudgetK`（千円）, `neighbors`（Top-K詳細）

## 履歴
- サーバ保存なし。ブラウザ `localStorage` に保存し、**JSONダウンロード**が可能。

## パラメータ
- `.env.local` または画面の「パラメータ」から調整
  - `WEIGHT_SUM` / `WEIGHT_ASS`（既定 0.6/0.4）
  - `TOPK`（既定 8）
  - `TAU`（既定 0.07）

## 注意
- 本実装は**推定支援**を目的とし、厳密な見積保証は行いません。スコープ差分の解釈が重要です。
- 精度改善には、部局/対象人口/投資性・経常性/年度数などの構造化特徴量の導入を推奨します。
