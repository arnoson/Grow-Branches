export class KerningInfo {
  constructor(tree) {
    this.tree = tree
    this.raster = null
    this.edges = {
      left: null,
      right: null
    }
    this.width = null
    this.height = null
    this.debug = true
  }

  update() {
    this.raster?.remove()

    const { tree } = this
    const { kerningResolution } = tree
    const { strokeWidth } = tree.item

    // If stroke width ist too thin, some paths might get lost in rasterization.
    tree.item.strokeWidth = 20
    const raster = (this.raster = tree.item.rasterize(kerningResolution))
    tree.item.strokeWidth = strokeWidth

    // Add the raster to the tree so it will move with the tree. This is usefull
    // for debugging.
    this.debug && tree.item.addChild(raster)

    this.edges = this._getEdges(raster)
    this.width = raster.width
    this.height = raster.height
  }

  _getEdges(raster) {
    return {
      left: this._getEdge(raster, 'left'),
      right: this._getEdge(raster, 'right')
    }
  }

  _getEdge(raster, side) {
    const edge = []
    const { width, height } = raster
    const sideLeft = side === 'left'

    for (let y = 0; y < height; y++) {
      for (let i = 0; i < width; i++) {
        const x = sideLeft ? i : width - 1 - i
        const pixel = raster.getPixel(x, y)
        if (pixel.alpha) {
          edge[y] = sideLeft ? x : width - 1 - x
          this.debug && raster.setPixel(x, y, sideLeft ? 'red' : 'blue')
          break
        }
      }
    }

    return edge
  }
}
