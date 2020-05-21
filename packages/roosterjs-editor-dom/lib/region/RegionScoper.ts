import Position from '../selection/Position';
import SelectionScoper from '../contentTraverser/SelectionScoper';
import { ContentTraverser } from '..';
import { getNextLeafSibling, getPreviousLeafSibling } from '../utils/getLeafSibling';
import {
    BlockElement,
    IContentTraverser,
    NodePosition,
    PositionType,
    Region,
} from 'roosterjs-editor-types';

const SkipTags = ['TABLE'];

export default class RegionScoper extends SelectionScoper implements Region {
    constructor(root: Node, fullRange: Range, child1?: Node, child2?: Node) {
        const startNode = child1 ? getNextLeafSibling(root, child1) : root.firstChild;
        const endNode = child2 ? getPreviousLeafSibling(root, child2) : root.lastChild;

        let start: NodePosition;
        let end: NodePosition;
        if (startNode && endNode) {
            const regionStart = new Position(startNode, PositionType.Begin).normalize();
            const regionEnd = new Position(endNode, PositionType.End).normalize();
            start = Position.getStart(fullRange).normalize();
            end = Position.getEnd(fullRange).normalize();
            start = start.isAfter(regionStart) ? start : regionStart;
            end = end.isAfter(regionEnd) ? regionEnd : end;
        }

        super(root, start, end);
    }

    containsBlock(block: BlockElement): boolean {
        return this.isBlockInScope(block);
    }

    createContentTraverser(): IContentTraverser {
        return new ContentTraverser(this);
    }

    getSkipTags(): string[] {
        return SkipTags;
    }
}
