import collapseNodes from '../utils/collapseNodes';
import contains from '../utils/contains';
import ContentTraverser from '../contentTraverser/ContentTraverser';
import findClosestElementAncestor from '../utils/findClosestElementAncestor';
import Position from '../selection/Position';
import queryElements from '../utils/queryElements';
import { isNode } from 'roosterjs-cross-window';
import {
    getNextLeafSibling,
    getPreviousLeafSibling,
    getLeafSibling,
} from '../utils/getLeafSibling';
import {
    BlockElement,
    DocumentPosition,
    PositionType,
    QueryScope,
    Region,
    NodePosition,
} from 'roosterjs-editor-types';

/**
 * Get regions impacted by the given range under the root node
 * @param root Root node to get regions from
 * @param range A selection range. Regions will be created acording to this range. Each region will be
 * fully or partially covered by this range.
 */
export default function getRegionsFromRange(root: HTMLElement, range: Range): Region[] {
    return RegionImpl.createRegionFromRange(root, range);
}

const SkipTags = ['TABLE'];
const OuterSelector = 'table';
const InnerSelector = 'td,th';

interface Boundary {
    innerNode: Node;
    children: {
        outerNode: Node;
        boundaries: Boundary[];
    }[];
}

type RegionCreator = (rootNode: Node, child1?: Node, child2?: Node) => RegionImpl;

class RegionImpl implements Region {
    private start: NodePosition;
    private end: NodePosition;
    private regionStart: NodePosition;
    private regionEnd: NodePosition;

    static createRegionFromRange(root: HTMLElement, range: Range): Region[] {
        if (!root || !range) {
            return [];
        }

        const boundaryTree = buildBoundaryTree(root, range);
        const start = findClosestElementAncestor(range.startContainer, root, InnerSelector) || root;
        const end = findClosestElementAncestor(range.endContainer, root, InnerSelector) || root;
        const creator = (root: Node, child1?: Node, child2?: Node) =>
            areNodesValid(root, child1, child2) && new RegionImpl(root, range, child1, child2);

        const [regions] = iterateNodes(creator, boundaryTree, start, end);

        return regions.filter(r => !!r);
    }

    contains(blockOrNode: Node | BlockElement): boolean {
        if (!blockOrNode) {
            return false;
        } else if (isNode(blockOrNode)) {
            return this.isNodeInRegion(blockOrNode);
        } else {
            const startNode = blockOrNode.getStartNode();
            const endNode = blockOrNode.getEndNode();
            return (
                this.isNodeInRegion(startNode) &&
                (startNode == endNode || this.isNodeInRegion(endNode))
            );
        }
    }

    getSelectedBlockElements(): BlockElement[] {
        const blocks: BlockElement[] = [];
        const traverser = ContentTraverser.createSelectionTraverser(
            this.rootNode,
            this.start,
            this.end,
            SkipTags
        );

        for (
            let block = traverser?.currentBlockElement;
            !!block;
            block = traverser.getNextBlockElement()
        ) {
            blocks.push(block);
        }

        return blocks;
    }

    getLeafSiblingInRegion(startNode: Node, isNext: boolean): Node {
        return getLeafSibling(this.rootNode, startNode, isNext, SkipTags);
    }

    collapseNodes(nodes: Node[]): Node[] {
        if (!nodes || nodes.length == 0) {
            return [];
        }

        const firstNode = nodes[0];
        const lastNode = nodes[nodes.length - 1];

        if (this.contains(firstNode) && this.contains(lastNode)) {
            return collapseNodes(this.rootNode, firstNode, lastNode, true /*canSplitParent*/);
        } else {
            return [];
        }
    }

    findClosestElementAncestor(node: Node, selector: string): Node {
        return this.contains(node)
            ? findClosestElementAncestor(node, this.rootNode, selector)
            : null;
    }

    private constructor(
        private rootNode: Node,
        fullRange: Range,
        private child1?: Node,
        private child2?: Node
    ) {
        const startNode = child1
            ? getNextLeafSibling(rootNode, child1, SkipTags)
            : rootNode.firstChild;
        const endNode = child2
            ? getPreviousLeafSibling(rootNode, child2, SkipTags)
            : rootNode.lastChild;
        this.regionStart = new Position(startNode, PositionType.Begin).normalize();
        this.regionEnd = new Position(endNode, PositionType.End).normalize();

        if (startNode && endNode) {
            this.start = Position.getStart(fullRange).normalize();
            this.end = Position.getEnd(fullRange).normalize();
            this.start = this.start.isAfter(this.regionStart) ? this.start : this.regionStart;
            this.end = this.end.isAfter(this.regionEnd) ? this.regionEnd : this.end;
        }
    }

    private isNodeInRegion(node: Node): boolean {
        return (
            contains(this.rootNode, node) &&
            (!this.child1 ||
                this.child1.compareDocumentPosition(node) == DocumentPosition.Following) &&
            (!this.child2 ||
                this.child2.compareDocumentPosition(node) == DocumentPosition.Preceding)
        );
    }
}

function buildBoundaryTree(root: HTMLElement, range: Range): Boundary {
    const allBoundaries: Boundary[] = [{ innerNode: root, children: [] }];
    const inSelectionOuterNode = queryElements(
        root,
        OuterSelector,
        null /*callback*/,
        QueryScope.InSelection,
        range
    );

    // According to https://www.w3.org/TR/selectors-api/#queryselectorall, the result of querySelectorAll
    // is in document order, which is what we expect. So we don't need to sort the result here.
    queryElements(
        root,
        InnerSelector,
        thisInnerNode => {
            const thisOuterNode = findClosestElementAncestor(thisInnerNode, root, OuterSelector);
            if (thisOuterNode && inSelectionOuterNode.indexOf(thisOuterNode) < 0) {
                const boundary: Boundary = { innerNode: thisInnerNode, children: [] };

                for (let i = allBoundaries.length - 1; i >= 0; i--) {
                    const { innerNode, children } = allBoundaries[i];
                    if (contains(innerNode, thisOuterNode)) {
                        let child = children.filter(c => c.outerNode == thisOuterNode)[0];

                        if (!child) {
                            child = { outerNode: thisOuterNode, boundaries: [] };
                            children.push(child);
                        }

                        child.boundaries.push(boundary);
                        break;
                    }
                }
                allBoundaries.push(boundary);
            }
        },
        QueryScope.OnSelection,
        range
    );

    return allBoundaries[0];
}

function iterateNodes(
    creator: RegionCreator,
    boundary: Boundary,
    start: Node,
    end: Node,
    started?: boolean
): [Region[], boolean, boolean] {
    started = started || boundary.innerNode == start;
    let ended = false;
    const { children, innerNode } = boundary;
    let regions: Region[] = [];

    if (children.length == 0) {
        regions.push(creator(innerNode));
    } else {
        // Need to run one more time to add region after all children
        for (let i = 0; i <= children.length && !ended; i++) {
            const { outerNode, boundaries } = children[i] || {};
            const previousOuterNode = children[i - 1]?.outerNode;
            if (started) {
                regions.push(creator(innerNode, previousOuterNode, outerNode));
            }

            boundaries?.forEach(child => {
                let newRegions: Region[];
                [newRegions, started, ended] = iterateNodes(creator, child, start, end, started);
                regions = regions.concat(newRegions);
            });
        }
    }

    return [regions, started, ended || innerNode == end];
}

function areNodesValid(root: Node, child1: Node, child2: Node) {
    if (!root || !root.firstChild) {
        return false;
    } else {
        const child1Next = child1 && getNextLeafSibling(root, child1, SkipTags);
        const child2Prev = child2 && getPreviousLeafSibling(root, child2, SkipTags);
        const child1Valid = !child1 || (contains(root, child1) && contains(root, child1Next));
        const child2Valid = !child2 || (contains(root, child2) && contains(root, child2Prev));
        const bothValid =
            !child1 ||
            !child2 ||
            (!contains(child1, child2, true) &&
                !contains(child1, child2Prev, true) &&
                !contains(child2, child1, true) &&
                !contains(child2, child1Next));
        return child1Valid && child2Valid && bothValid;
    }
}
