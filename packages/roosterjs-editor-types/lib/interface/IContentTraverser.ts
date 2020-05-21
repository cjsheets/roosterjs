import BlockElement from './BlockElement';
import InlineElement from './InlineElement';

/**
 * The provides traversing of content inside editor.
 * There are two ways to traverse, block by block, or inline element by inline element
 * Block and inline traversing is independent from each other, meanning if you traverse block by block, it does not change
 * the current inline element position
 */
export default interface IContentTraverser {
    /**
     * Get current block
     */
    readonly currentBlockElement: BlockElement;

    /**
     * Get next block element
     */
    getNextBlockElement(): BlockElement;

    /**
     * Get previous block element
     */
    getPreviousBlockElement(): BlockElement;

    /**
     * Current inline element getter
     */
    readonly currentInlineElement: InlineElement;

    /**
     * Get next inline element
     */
    getNextInlineElement(): InlineElement;

    /**
     * Get previous inline element
     */
    getPreviousInlineElement(): InlineElement;
}
