import BlockElement from './BlockElement';

export default interface Region {
    getRange(): Range;
    getBoundaryNode(): Node;
    intersectRange(range: Range): Range;
    contains(element: BlockElement): boolean;
}
