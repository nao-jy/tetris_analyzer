import initWasm from "../coldclear/cold_clear_2.js";
import wasmUrl from "../coldclear/cold_clear_2_bg.wasm?url";
import botConfigJson from "../assets/default.json";
import {
  configure,
  initialize,
  process_message,
  think,
} from "../coldclear/cold_clear_2.js";
import type {
  Board,
  BotConfig,
  Piece,
  Placement,
} from "../coldclear/cold_clear_2.js";

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
    configure(botConfigJson as unknown as BotConfig);
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
    const moves: Placement[] = [];
    let nodes = 0;
    let nps = 0;

    // A successful play consumes one known queue piece. Stop before trying to
    // advance beyond the user's visible next queue, or earlier if the bot has
    // no legal suggestion (for example, a top-out).
    for (let index = 0; index < queue.length; index += 1) {
      const work = think(iterations);
      nodes += work.nodes;
      nps = work.nps;

      const suggestion = process_message({ type: "suggest" });
      if (
        !suggestion ||
        suggestion.type !== "suggestion" ||
        suggestion.moves.length === 0
      )
        break;

      const move = suggestion.moves[0];
      moves.push(move);
      if (index < queue.length - 1) {
        const playResponse = process_message({ type: "play", move });
        const playError = playResponse as
          | { type: string; reason?: unknown }
          | undefined;
        if (playError?.type === "error")
          throw new Error(
            String(playError.reason ?? "着手を適用できませんでした。"),
          );
      }
    }

    workerScope.postMessage({
      ok: true,
      moves,
      nodes,
      nps,
    });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "解析に失敗しました。",
    });
  }
};
