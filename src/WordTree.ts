import { BaseTree } from './BaseTree'
import { Font } from './Font'
import { Glyph } from './Glyph'
import { GrowingOrder, Glyphs } from './typedef'

export interface WordTreeOptions {
  font?: Font
  /**
   * The minimum distance between the lowest branch and the bottom.
   */
  branchBottomDistance?: number
  /**
   * The order in which the branches grow.
   */
  growingOrder?: GrowingOrder
  /**
   * Wether or not to start growing branches at the trunk
   */
  startAtTrunk?: boolean
}

export interface WordTree extends WordTreeOptions {}

export class WordTree extends BaseTree {
  glyphs: Glyphs = []
  lowestGlyph: Glyph = null

  /**
   * @param {WordTreeOptions} options
   */
  constructor({
    font,
    branchBottomDistance = 30,
    growingOrder = 'natural',
    startAtTrunk = true
  }: WordTreeOptions = {}) {
    super()

    Object.assign(this, {
      font,
      branchBottomDistance,
      growingOrder,
      startAtTrunk
    })
  }

  /**
   * Grow a word.
   * @param {string} string The word to grow.
   */
  grow(string) {
    const glyph = this._createGlyph(string[0])
    glyph.alignVertical()
    this._addGlyph(glyph)
    this._growRecursive(glyph, string.slice(1))
    this._adjustTrunk()
    this.item.pivot = glyph.item.pivot
  }

  /**
   * Remove all glyphs.
   */
  chop() {
    for (const glyph of this.glyphs) {
      glyph.remove()
    }
    this.glyphs = []
    this.lowestGlyph = null
  }

  /**
   * Continue growing the word recursively.
   * @private
   * @param prevGlyph The previous glyph.
   * @param string The remaining characters to grow.
   */
  _growRecursive(prevGlyph: Glyph, string: string) {
    // Only keep growing if we have characters left.
    if (string.length) {
      // Add a glyph to each branch of the previous glyph.
      const branches = prevGlyph.sortBranches(
        this.growingOrder,
        this.startAtTrunk
      )
      for (const branch of branches) {
        const glyph = this._createGlyph(string[0])
        glyph.alignAtBranch(branch)

        this._adjustTrunk()

        if (this._crossesGlyph(glyph)) {
          glyph.remove()
        } else {
          const { lowestGlyph } = this
          this.lowestGlyph =
            !lowestGlyph || glyph.isLowerThan(lowestGlyph) ? glyph : lowestGlyph

          this._addGlyph(glyph)
          this._growRecursive(glyph, string.slice(1))
        }
      }
    }
  }

  /**
   * Get the corresponding glyph for the character.
   * @private
   * @param char The character.
   */
  _createGlyph(char: string) {
    const definition = this.font.glyphDefinitions.get(char.charCodeAt(0))
    if (!definition) {
      throw new Error(`Couldn't find glyph definition for char '${char}'`)
    }
    return definition.instance()
  }

  /**
   * Add a glyph and it's item.
   * @private
   */
  _addGlyph(glyph: Glyph) {
    this.glyphs.push(glyph)
    this.item.addChild(glyph.item)
  }

  /**
   * Check if a glyph crosses this tree.
   * @private
   * @returns Wether or not the glyph crosses.
   */
  _crossesGlyph(glyph: Glyph) {
    const { glyphs } = this
    for (let i = 0; i < glyphs.length; i++) {
      // TODO find good thresholds.
      // if (
      //   Math.abs(glyphs[i].position.x - glyph.position.x) > 100 &&
      //   Math.abs(glyphs[i].position.y - glyph.position.y) > 100
      // ) {
      //   continue
      // }

      for (const branchA of glyph.branches) {
        for (const branchB of glyphs[i].branches) {
          // Get intersections, but exclude the trunk's starting point, because
          // they should intersect there.
          const intersections = branchA.getIntersections(
            branchB,
            (inter: paper.Segment) =>
              !inter.point.equals(glyph.trunk.firstSegment.point)
          )
          // Allow one intersection, if it isn't a crossing. If branches can
          // touch themselves at one point it will result in a 'fuller' tree.
          if (
            intersections.length &&
            (intersections.length > 1 || intersections[0].isCrossing())
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  /**
   * Extend the trunk, so that the lowest branch doesn't touch the ground.
   */
  _adjustTrunk() {
    const { lowestGlyph, branchBottomDistance } = this

    if (lowestGlyph) {
      const firstGlyph = this.glyphs[0]
      const distance =
        this.lowestGlyph.item.bounds.bottomLeft.y - firstGlyph.position.y

      if (distance > branchBottomDistance * -1) {
        const { trunk } = firstGlyph
        trunk.insert(0, trunk.firstSegment)
        trunk.firstSegment.point.y += distance + branchBottomDistance
        firstGlyph.item.pivot = trunk.firstSegment.point
      }
    }
  }
}
