import BlockElement from './BlockElement';

/**
 * Represents a DOM region.
 * A region is a range under a given node, and possibly after one child and before another child
 * e.g.
 * ```html
 * <div>
 *   <table>...</table>
 *   <span>...</span>
 *   <span>...</span>
 *   <table>...</table>
 * <div>
 * We can define a region under DIV before the second TABLE and after the first TABLE
 *
 * This is used when user's selection go across different TD elements or start from TD and end after
 * that TD (or inverse way). Some block operation should not ruin the TABLE structure, so we need to
 * split the selection into several regions.
 */
export default interface Region {
    /**
     * Check if a given node or block element is contained by this region
     * @param nodeOrBlock The node or block element to check
     */
    contains(nodeOrBlock: Node | BlockElement): boolean;

    /**
     * Collapse nodes within this region to their common ascenstor node under this region
     * @param nodes Nodes to collapse
     */
    collapseNodes(nodes: Node[]): Node[];

    /**
     * Find closest ancestor node with the given selector under this region start from the given node
     * @param node The node to find start from. If this node satisfy the selector, return this node
     * @param selector The selector to search with
     */
    findClosestElementAncestor(node: Node, selector: string): Node;

    /**
     * Get all block elements covered by the selection under this region
     */
    getSelectedBlockElements(): BlockElement[];

    /**
     * Get a leaf sibling node of the given node under this region
     * @param startNode The node to search from
     * @param isNext True to find next sibling leaf, otherwise find previous one
     */
    getLeafSiblingInRegion(startNode: Node, isNext: boolean): Node;
}
