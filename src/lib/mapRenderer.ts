import L from 'leaflet'

type CanvasLifecycle = L.Canvas & {
  _ctx?: CanvasRenderingContext2D
  _map?: L.Map
  _redrawRequest: number | null
  _redraw(): void
  _destroyContainer(): void
}

/** Leaflet 1.9 may queue a redraw while React is removing its vector layers. */
export function createMapRenderer(options: L.RendererOptions = {}): L.Canvas {
  const base = L.Canvas.prototype as CanvasLifecycle
  const ManagedCanvas = L.Canvas.extend({
    _redraw(this: CanvasLifecycle) {
      if (!this._ctx || !this._map) {
        this._redrawRequest = null
        return
      }
      base._redraw.call(this)
    },
    _destroyContainer(this: CanvasLifecycle) {
      base._destroyContainer.call(this)
      this._redrawRequest = null
    },
  }) as unknown as { new (options: L.RendererOptions): L.Canvas }
  return new ManagedCanvas(options) as L.Canvas
}
