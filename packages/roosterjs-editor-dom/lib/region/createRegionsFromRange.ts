import contains from '../utils/contains';
import findClosestElementAncestor from '../utils/findClosestElementAncestor';
import NodeRegion from './NodeRegion';
import Position from '../selection/Position';
import queryElements from '../utils/queryElements';
import RangeRegion from './RangeRegion';
import { DocumentPosition, PositionType, QueryScope, Region } from 'roosterjs-editor-types';
import { getNextLeafSibling, getPreviousLeafSibling } from '../utils/getLeafSibling';

interface BoundaryNode {
    node: Node;
    children: BoundaryNode[];
    containsStart: boolean;
    conatinsEnd: boolean;
}

const BoundarSelector = 'td';

export default function createRegionsFromRange(root: HTMLElement, range: Range): Region[] {
    const tables = queryElements(root, 'table', null /*callback*/, QueryScope.InSelection, range);
    const start = findClosestElementAncestor(range.startContainer, root, BoundarSelector) || root;
    const end = findClosestElementAncestor(range.endContainer, root, BoundarSelector) || root;
    const boundaryRoot = createBoundaryNode(root, start, end);
    const boundaryNodes = [boundaryRoot];

    queryElements(
        root,
        BoundarSelector,
        node => {
            const table = findClosestElementAncestor(node, root, 'table');
            if (table && tables.indexOf(table) < 0) {
                boundaryNodes.push(createBoundaryNode(node, start, end));
            }
        },
        QueryScope.OnSelection,
        range
    );

    boundaryNodes.sort(cellSortCallback).forEach((cell, i) => {
        for (i--; i >= 0; i--) {
            if (contains(boundaryNodes[i].node, cell.node)) {
                boundaryNodes[i].children.push(cell);
                break;
            }
        }
    });

    const regions: Region[] = [];
    iterateNodes(boundaryRoot, root, regions, false /*isStarted*/);

    return regions;
}

function createBoundaryNode(node: Node, startNode: Node, endNode: Node): BoundaryNode {
    return {
        node: node,
        children: [],
        containsStart: node == startNode,
        conatinsEnd: node == endNode,
    };
}

function cellSortCallback(cell1: BoundaryNode, cell2: BoundaryNode): number {
    const pos = cell1.node.compareDocumentPosition(cell2.node);
    return pos == DocumentPosition.Same
        ? 0
        : (pos & DocumentPosition.ContainedBy) == DocumentPosition.ContainedBy ||
          (pos & DocumentPosition.Following) == DocumentPosition.Following
        ? -1
        : 1;
}

function iterateNodes(
    boundary: BoundaryNode,
    root: Node,
    regions: Region[],
    isStarted: boolean
): [boolean, boolean] {
    isStarted = isStarted || boundary.containsStart;
    let isEnded = false;

    if (boundary.children.length == 0) {
        regions.push(new NodeRegion(boundary.node));
    } else {
        let startNode = isStarted && boundary.node;

        for (let i = 0; i < boundary.children.length && !isEnded; i++) {
            const child = boundary.children[i];

            if (startNode) {
                tryAddRegion(root, regions, startNode, getPreviousLeafSibling(root, child.node));
            }

            [isStarted, isEnded] = iterateNodes(child, root, regions, isStarted);
            startNode = isStarted && getNextLeafSibling(root, child.node);
        }

        if (startNode && !isEnded) {
            tryAddRegion(root, regions, startNode, boundary.node);
        }
    }

    return [isStarted, boundary.conatinsEnd || isEnded];
}

function tryAddRegion(root: Node, regions: Region[], startNode: Node, endNode: Node) {
    const startPos = startNode && new Position(startNode, 0).normalize();
    const endPos = endNode && new Position(endNode, PositionType.End).normalize();
    if (startPos && endPos && endPos.isAfter(startPos)) {
        regions.push(new RangeRegion(root, startPos, endPos));
    }
}
