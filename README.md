# Tetris Board Analyzer

[日本語](README.ja.md) | **English**

A Chrome extension that analyzes Tetris boards using Cold Clear 2 WASM. Click the extension icon, then select **Open side panel** in the popup to launch the analyzer. All analysis runs in your browser; board data is never sent elsewhere.

## Usage

1. Choose the board height, then drag across cells to place pieces or garbage blocks. Use the erase tool to clear cells by dragging.
2. Select **From image** and choose the board area on the page. The previous selection is restored the next time you use it. Drag inside the selection to move it, or drag an edge or corner to resize it. The extension overlays a grid with 10 columns and the selected number of rows, then estimates the board from the color at the center of each cell.
3. Select the upcoming pieces and set the hold, REN, and Back-to-Back states.
4. Choose the search budget and click **Analyze board**. Cold Clear's recommended moves are shown in evaluation order.

The board editor treats the top of the board as empty and converts the board to TBP's 40-row by 10-column format before passing it to WASM. Communication with WASM uses the TBP `start` → `suggest` messages.

## Development

```sh
npm install
npm run dev
```

Enable Developer mode at `chrome://extensions` and load the `dist` directory. Build a distributable package with `npm run build`.

## Distribution

GitHub Actions builds the extension on pushes to `main` and pull requests targeting `main`, then stores the ZIP as an Actions artifact for 14 days. To publish a GitHub Release, update the `version` in `package.json` and push a tag in the `v<version>` format (for example, `v1.0.1`). When the tag version matches `package.json`, the built ZIP is automatically attached to the GitHub Release.

## License

See `src/coldclear/LICENSE-APACHE` and `src/coldclear/LICENSE-MIT` for the Cold Clear 2 licenses.
