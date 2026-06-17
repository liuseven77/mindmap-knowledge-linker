// Coordinate transforms between world space and screen space.
// All functions are pure — no DOM, no React, no side effects.

interface ViewState {
  panX: number;
  panY: number;
  scale: number;
  canvasW: number;
  canvasH: number;
}

/** Convert world coordinates to screen pixel position */
export function worldToScreen(wx: number, wy: number, vs: ViewState) {
  return {
    x: vs.canvasW / 2 + vs.panX + (wx - vs.canvasW / 2) * vs.scale,
    y: vs.canvasH / 2 + vs.panY + (wy - vs.canvasH / 2) * vs.scale,
  };
}

/** Convert screen pixel position back to world coordinates */
export function screenToWorld(sx: number, sy: number, vs: ViewState) {
  return {
    x: (sx - vs.canvasW / 2 - vs.panX) / vs.scale + vs.canvasW / 2,
    y: (sy - vs.canvasH / 2 - vs.panY) / vs.scale + vs.canvasH / 2,
  };
}

/** Calculate the pan needed to center a world point on the canvas */
export function panToCenter(wx: number, wy: number, vs: ViewState) {
  return {
    panX: (vs.canvasW / 2 - wx) * vs.scale,
    panY: (vs.canvasH / 2 - wy) * vs.scale,
  };
}

/** Build a CSS transform string for a node at world position */
export function nodeTransform(wx: number, wy: number, size: number, vs: ViewState) {
  const p = worldToScreen(wx, wy, vs);
  return `translate(${p.x - 60}px, ${p.y - 20}px) scale(${size * vs.scale})`;
}
