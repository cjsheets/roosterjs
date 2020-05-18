import contains from '../utils/contains';
import createRange from '../selection/createRange';
import intersectRange from '../selection/intersectRange';
import { BlockElement, PositionType, Region } from 'roosterjs-editor-types';

export default class NodeRegion implements Region {
    constructor(private node: Node) {}

    getBoundaryNode(): Node {
        return this.node;
    }

    getRange(): Range {
        return createRange(this.node, 0, this.node, PositionType.End);
    }

    intersectRange(range: Range): Range {
        return intersectRange(this.getRange(), range);
    }

    contains(block: BlockElement): boolean {
        if (!block) {
            return false;
        }
        return contains(this.node, block.getStartNode()) && contains(this.node, block.getEndNode());
    }
}
