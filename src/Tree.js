import { Group } from 'paper'
import { Kerner } from './Kerner'
import { BaseTree } from './BaseTree'
import { WordTree } from './WordTree'

/**
 * An array of either arrays or words. Each array will be a new Tree and each
 * word a WordTree.
 * @example
 * // This describes a tree consisting of two trees, each of them consisting of
 * // two word trees.
 * const content = [
 *    ['test', 'one],
 *    ['test', 'two']
 * ]
 * @typedef {Array} BranchesContent
 */

export class Tree extends BaseTree {
  /**
   * @param {object} [options] - The options.
   */
  constructor(options = {}) {
    super()
    this.options = options
    this.kerner = new Kerner()
    this.trees = []

    this.sideLeft = this.item.addChild(
      new Group({ name: 'side left', applyMatrix: false, rotation: -90 })
    )
    this.sideRight = this.item.addChild(
      new Group({ name: 'side right', applyMatrix: false, rotation: 90 })
    )
  }

  /**
   * Grow child trees.
   * @param {BranchesContent} content – The content.
   */
  grow(content) {
    for (const el of content) {
      const Ctor = typeof el === 'string' ? WordTree : Tree
      const tree = new Ctor(this.options)
      tree.grow(el)
      this._addTree(tree)
    }
    this._alignTrees()
    this.item.pivot = this.trunk.lastSegment.point
  }

  /**
   * Remove all child trees.
   */
  chop() {
    for (const tree of this.trees) {
      tree.remove()
    }
    this.item.removeChildren()
    this.trees = []
  }

  /**
   * Add a child tree and it's item.
   * @private
   * @param {Branches.Tree} tree
   */
  _addTree(tree) {
    this.trees.push(tree)
    this.kerner.kern(tree.item, this.item)
    this.item.addChild(tree.item)
  }

  /**
   * Distribute the trees into left and right side.
   * @private
   * @returns {Object} – An object containing the distributed trees.
   */
  _distributeTrees() {
    const { item, trees } = this

    let center
    const left = []
    const right = []

    if (trees.length === 1) {
      // If there is only one tree, we will place it at the center.
      center = trees[0]
    } else if (trees.length === 2) {
      // We always want a center tree, so two trees are divided into left group
      // and center.
      left.push(trees[0])
      center = trees[1]
    } else if (trees.length === 3) {
      // Three trees get divided one in each group.
      left.push(trees[0])
      center = trees[1]
      right.push(trees[2])
    } else {
      // If there are more than three trees, we divide them in the center.
      const threshold = item.bounds.center.x
      for (const tree of trees) {
        const side = tree.position.x < threshold ? left : right
        side.push(tree)
      }
      // Then we pick the smaller of the two outer trees as the center tree.
      // Most of the time this just looks best. But we also make sure that there
      // is at least one tree left on each side.
      center =
        right.length === 1 ||
        left[left.length - 1].item.bounds.width < right[0].item.bounds.width
          ? left.pop()
          : right.shift()
    }

    return { left, center, right }
  }

  /**
   * @private
   * @param {Array<Branches.Tree>} trees
   */
  _getTreesWidth(trees) {
    return trees[trees.length - 1].item.bounds.x - trees[0].item.bounds.x
  }

  /**
   * Distribute the trees into left and right side an the center tree and align
   * them around the trunk.
   * @private
   */
  _alignTrees() {
    const { sideLeft, sideRight } = this
    const { left, center, right } = this._distributeTrees()

    sideLeft.removeChildren()
    sideLeft.addChildren(left.map(tree => tree.item))

    sideRight.removeChildren()
    sideRight.addChildren(right.map(tree => tree.item))

    const [smallerSide, biggerSide] =
      sideLeft.bounds.height < sideRight.bounds.height
        ? [sideLeft, sideRight]
        : [sideRight, sideLeft]

    const maxHeight = biggerSide.bounds.height

    // 'Stretch' the smaller side so it fits to the bigger side. We don't
    // actually stretch the trees, but their positions.
    const stretchFactor = maxHeight / smallerSide.bounds.height
    for (const item of smallerSide.children) {
      item.position.x *= stretchFactor
    }

    // Adjust trunk.
    const { trunk } = this
    trunk.segments = [
      [0, 0],
      [0, maxHeight + 20]
    ]

    // Align both sides horizontally alongside the trunk ...
    sideLeft.bounds.right = trunk.bounds.left
    sideRight.bounds.left = trunk.bounds.right
    // ... then align the bigger side to the top ...
    biggerSide.bounds.top = trunk.bounds.top
    // ... and vertically center the smaller side on the bigger side.
    smallerSide.bounds.center.y = biggerSide.bounds.center.y
    // Put the center tree on the top.
    center.item.position = trunk.bounds.topCenter
  }
}