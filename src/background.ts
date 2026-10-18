type CaptureRequest = {
  type: "capture-board-region";
  captureBox: { x: number; y: number; width: number; height: number };
  viewportWidth: number;
  viewportHeight: number;
};

async function cropScreenshot(dataUrl: string, request: CaptureRequest) {
  const image = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const scaleX = image.width / request.viewportWidth;
  const scaleY = image.height / request.viewportHeight;
  const sourceX = Math.max(0, Math.round(request.captureBox.x * scaleX));
  const sourceY = Math.max(0, Math.round(request.captureBox.y * scaleY));
  const sourceWidth = Math.min(
    image.width - sourceX,
    Math.round(request.captureBox.width * scaleX),
  );
  const sourceHeight = Math.min(
    image.height - sourceY,
    Math.round(request.captureBox.height * scaleY),
  );
  if (sourceWidth < 1 || sourceHeight < 1) {
    image.close();
    throw new Error("選択した範囲を撮影できませんでした。");
  }

  const canvas = new OffscreenCanvas(sourceWidth, sourceHeight);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("画像を処理できませんでした。");
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );
  image.close();

  const blob = await canvas.convertToBlob({ type: "image/png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "capture-board-region") {
    if (typeof message?.type === "string" && message.type.startsWith("board-screenshot-")) {
      sendResponse({ ok: true });
    }
    return false;
  }

  const request = message as CaptureRequest;
  const windowId = sender.tab?.windowId;
  if (windowId === undefined) {
    sendResponse({ ok: false, error: "撮影対象のタブが見つかりませんでした。" });
    return false;
  }

  void chrome.tabs
    .captureVisibleTab(windowId, { format: "png" })
    .then((image) => cropScreenshot(image, request))
    .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "画面を撮影できませんでした。",
      }),
    );
  return true;
});
