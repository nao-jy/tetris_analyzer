# Tetris Board Analyzer

Cold Clear 2 WASM を使ってテトリスの盤面から候補手を計算する Chrome 拡張です。拡張機能のアイコンを押し、ポップアップの「サイドパネルを開く」から解析画面を開きます。解析はブラウザー内で行い、盤面情報を外部へ送信しません。

## 使い方

1. 盤面の高さを選び、セルをドラッグしてミノまたはお邪魔ブロックを連続して置きます。消去ツールでドラッグするとセルを空に戻せます。
2. ネクストのミノを選択し、ホールド、REN、Back-to-Back の状態を入力します。
3. 探索量を選んで「盤面を解析」を押します。Cold Clear の推奨手が評価順に表示されます。

盤面は画面上部を空として編集し、TBP の 40 行 × 10 列に変換して WASM に渡します。WASM とのやりとりは TBP の `start` → `suggest` メッセージで行います。

## 開発

```sh
npm install
npm run dev
```

Chrome の `chrome://extensions` でデベロッパーモードを有効にし、`dist` を読み込んでください。配布用ビルドは `npm run build` で生成されます。

## ライセンス

Cold Clear 2 のライセンスは同梱の `src/coldclear/LICENSE-APACHE` および `src/coldclear/LICENSE-MIT` を参照してください。
