import { Group } from 'paper'
import { Tree } from './Tree'
import { WordTree } from './WordTree'

export class SentenceTree extends Tree {
  /**
   * @param {object} param
   * @param {Branches.Font} font
   * @param {object} wordOptions
   */
  constructor({ font, words = [], wordOptions }) {
    super()
    this.font = font
    this.words = words
    this.wordOptions = wordOptions
    this.trees = []
    words.length && this.grow(words)
  }

  /**
   * Grow words.
   * @param {Array<string>} words
   */
  grow(words) {
    const { font } = this

    for (const word of words) {
      const tree = new WordTree({ font, word, ...this.wordOptions })
      this._addChildTree(tree)
    }

    this._alignChildTrees()
  }
}
