import BlockElement from './BlockElement';

export default interface Region {
    contains(nodeOrBlock: Node | BlockElement): boolean;
    collapseNodes(nodes: Node[]): Node[];
    findClosestElementAncestor(node: Node, selector: string): Node;
    getSelectedBlockElements(): BlockElement[];
    getLeafSiblingInRegion(startNode: Node, isNext: boolean): Node;
}
