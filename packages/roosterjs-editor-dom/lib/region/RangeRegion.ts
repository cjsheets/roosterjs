import createRange from '../selection/createRange';
import intersectRange from '../selection/intersectRange';
import { BlockElement, NodePosition, Region } from 'roosterjs-editor-types';

export default class RangeRegion implements Region {
    private range: Range;

    constructor(private root: Node, start: NodePosition, end: NodePosition) {
        this.range = createRange(start.normalize(), end.normalize());
    }

    getBoundaryNode(): Node {
        return this.root;
    }

    getRange(): Range {
        return this.range;
    }

    intersectRange(range: Range): Range {
        return intersectRange(this.range, range);
    }

    contains(block: BlockElement): boolean {
        let range = block && createRange(block.getStartNode(), block.getEndNode());
        range = this.intersectRange(range);
        return !!range && !range.collapsed;
    }
}
