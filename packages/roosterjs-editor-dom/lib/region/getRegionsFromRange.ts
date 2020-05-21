import contains from '../utils/contains';
import findClosestElementAncestor from '../utils/findClosestElementAncestor';
import queryElements from '../utils/queryElements';
import RegionScoper from './RegionScoper';
import { QueryScope, Region } from 'roosterjs-editor-types';

const OuterSelector = 'table';
const InnerSelector = 'td,th';

interface Boundary {
    innerNode: Node;
    children: {
        outerNode: Node;
        boundaries: Boundary[];
    }[];
}

export default function getRegionsFromRange(root: HTMLElement, range: Range): Region[] {
    if (!root || !range) {
        return [];
    }

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

    const regions: RegionScoper[] = [];
    const start = findClosestElementAncestor(range.startContainer, root, InnerSelector) || root;
    const end = findClosestElementAncestor(range.endContainer, root, InnerSelector) || root;

    iterateNodes(regions, root, allBoundaries[0], range, start, end);

    return regions;
}

function iterateNodes(
    regions: RegionScoper[],
    root: Node,
    boundary: Boundary,
    range: Range,
    start: Node,
    end: Node,
    started?: boolean
): [boolean, boolean] {
    started = started || boundary.innerNode == start;
    let ended = false;
    const { children, innerNode } = boundary;

    if (children.length == 0) {
        tryAddRegion(regions, new RegionScoper(innerNode, range));
    } else {
        // Need to run one more time to add region after all children
        for (let i = 0; i <= children.length && !ended; i++) {
            const { outerNode, boundaries } = children[i] || {};
            const previousOuterNode = children[i - 1]?.outerNode;
            tryAddRegion(
                regions,
                started && new RegionScoper(innerNode, range, previousOuterNode, outerNode)
            );
            boundaries?.forEach(child => {
                [started, ended] = iterateNodes(regions, root, child, range, start, end, started);
            });
        }
    }

    return [started, ended || innerNode == end];
}

function tryAddRegion(regions: RegionScoper[], region: RegionScoper) {
    if (region && region.getStartBlockElement()) {
        regions.push(region);
    }
}
