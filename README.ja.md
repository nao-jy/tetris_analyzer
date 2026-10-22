# Tetris Board Analyzer

**日本語** | [English](README.md)

Cold Clear 2 WASM を使ってテトリスの盤面から候補手を計算する Chrome 拡張です。拡張機能のアイコンを押し、ポップアップの「サイドパネルを開く」から解析画面を開きます。解析はブラウザー内で行い、盤面情報を外部へ送信しません。

## 使い方

1. 盤面の高さを選び、セルをドラッグしてミノまたはお邪魔ブロックを連続して置きます。消去ツールでドラッグするとセルを空に戻せます。
2. 「画像から」を押し、ページ上で盤面範囲を選びます。前回の範囲は次回も復元されます。枠の内側をドラッグして移動し、辺や角をドラッグして大きさを微調整できます。10列と選択した段数のグリッドを重ねて撮影し、各セル中央の色から盤面を推定します。
3. ネクストのミノを選択し、ホールド、REN、Back-to-Back の状態を入力します。
4. 探索量を選んで「盤面を解析」を押します。Cold Clear の推奨手が評価順に表示されます。

盤面は画面上部を空として編集し、TBP の 40 行 × 10 列に変換して WASM に渡します。WASM とのやりとりは TBP の `start` → `suggest` メッセージで行います。

## 開発

```sh
npm install
npm run dev
```

Chrome の `chrome://extensions` でデベロッパーモードを有効にし、`dist` を読み込んでください。配布用ビルドは `npm run build` で生成されます。

## 配布

GitHub Actions は `main` への push と pull request で拡張機能をビルドし、ZIP を Actions artifact として 14 日間保存します。GitHub Release として配布するには、`package.json` の `version` を更新して `v<version>` 形式のタグ（例: `v1.0.1`）を push してください。タグの版番号が `package.json` と一致すると、ビルドした ZIP が GitHub Release に自動で添付されます。

## ライセンス

Cold Clear 2 のライセンスは同梱の `src/coldclear/LICENSE-APACHE` および `src/coldclear/LICENSE-MIT` を参照してください。
