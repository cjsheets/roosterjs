import BlockElement from './BlockElement';

export default interface Region {
    contains(nodeOrBlock: Node | BlockElement): boolean;
    getBlockElementsInSelection(): BlockElement[];
    getLeafSiblingInRegion(startNode: Node, isNext: boolean): Node;
    collapseNodes(nodes: Node[]): Node[];
}
