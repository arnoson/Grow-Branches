import { Group, Segment } from 'paper'
import { Kerner } from './Kerner'
import { BaseTree } from './BaseTree'
import { WordTree, WordTreeOptions } from './WordTree'
import { BranchesContent } from './typedef'

export interface DistributedTrees {
  left: Array<BaseTree>
  right: Array<BaseTree>
  center: BaseTree
}

export class Tree extends BaseTree {
  kerner = new Kerner()
  trees: Array<BaseTree> = []
  sideLeft: paper.Group
  sideRight: paper.Group

  constructor(public options: WordTreeOptions) {
    super()
    this.options = options

    this.sideLeft = new Group({
      name: 'side left',
      applyMatrix: false,
      rotation: -90
    })

    this.sideRight = new Group({
      name: 'side right',
      applyMatrix: false,
      rotation: 90
    })

    this.item.addChildren([this.sideLeft, this.sideRight])
  }

  /**
   * Grow child trees.
   */
  grow(content: BranchesContent) {
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
   * Add a child tree and it's item.
   * @private
   */
  _addTree(tree: BaseTree) {
    this.trees.push(tree)
    this.kerner.kern(tree.item, this.item)
    this.item.addChild(tree.item)
  }

  /**
   * Distribute the trees into left and right side.
   * @private
   */
  _distributeTrees(): DistributedTrees {
    const { item, trees } = this

    let center: BaseTree
    const left: Array<BaseTree> = []
    const right: Array<BaseTree> = []

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
        const side = tree.bounds.center.x < threshold ? left : right
        side.push(tree)
      }
      // How we pick the center tree is bit tricky but will yield to more
      // balanced sides. If both sides have more than one children, we compare
      // which side would be bigger *after* we have picked the center tree of
      // them. Otherwise we just compare which side is bigger.
      const leftIsBigger =
        left.length > 1 && right.length > 1
          ? left[left.length - 2].bounds.right - left[0].bounds.left >
            right[right.length - 1].bounds.right - right[1].bounds.left
          : left[left.length - 1].bounds.right > threshold

      center = leftIsBigger ? left.pop() : right.shift()
    }

    return { left, center, right }
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
      new Segment([0, 0]),
      // TODO check where does '20' come from?
      new Segment([0, maxHeight + 20])
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
