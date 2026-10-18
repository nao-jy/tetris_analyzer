import initWasm from "../coldclear/cold_clear_2.js";
import wasmUrl from "../coldclear/cold_clear_2_bg.wasm?url";
import {
  initialize,
  process_message,
  think,
} from "../coldclear/cold_clear_2.js";
import type { Board, Piece } from "../coldclear/cold_clear_2.js";

type AnalysisRequest = {
  board: Board;
  queue: Piece[];
  hold?: Piece;
  combo: number;
  backToBack: boolean;
  iterations: number;
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

workerScope.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const { board, queue, hold, combo, backToBack, iterations } = event.data;
    await initWasm(wasmUrl);
    initialize();
    const started = process_message({
      type: "start",
      board,
      queue,
      hold,
      combo,
      back_to_back: backToBack,
    });
    const startResponse = started as
      | { type: string; reason?: unknown }
      | undefined;
    if (startResponse?.type === "error")
      throw new Error(
        String(startResponse.reason ?? "盤面を受け付けませんでした。"),
      );
    think(iterations);
    const suggestion = process_message({ type: "suggest" });
    if (!suggestion || suggestion.type !== "suggestion")
      throw new Error("候補手を取得できませんでした。");
    workerScope.postMessage({
      ok: true,
      moves: suggestion.moves,
      nodes: suggestion.move_info.nodes,
      nps: suggestion.move_info.nps,
    });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "解析に失敗しました。",
    });
  }
};
