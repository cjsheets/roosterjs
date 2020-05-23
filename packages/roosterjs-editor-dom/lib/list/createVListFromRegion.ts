import VList from './VList';
import { isListElement } from './getListTypeFromNode';
import { ListType, NodeType, Region } from 'roosterjs-editor-types';

type ListElement = HTMLOListElement | HTMLUListElement;
const ListSelector = 'ol,ul';

/**
 * @internal
 * @param region The region to get VList from
 * @param startNode (Optional) When specified, try get VList which will contain this node.
 * If not specified, get VList from selection of this region
 */
export default function createVListFromRegion(region: Region, startNode?: Node): VList {
    let nodes: Node[] = [];

    if (startNode) {
        const list = getRootListNode(region, startNode);
        if (list) {
            nodes.push(list);
        }
    } else {
        const blocks = region.getSelectedBlockElements();
        blocks.forEach(block => {
            const list = getRootListNode(region, block.getStartNode());

            if (list) {
                if (nodes[nodes.length - 1] != list) {
                    nodes.push(list);
                }
            } else {
                nodes.push(block.collapseToSingleElement());
            }
        });

        tryIncludeSiblingNode(region, nodes, false /*isNext*/);
        tryIncludeSiblingNode(region, nodes, true /*isNext*/);
        nodes = region
            .collapseNodes(nodes)
            .filter(
                node => node && (node.nodeType != NodeType.Text || node.nodeValue.trim() != '')
            );
    }

    let vList: VList = null;

    if (nodes.length > 0) {
        const firstNode = nodes.shift();
        vList = isListElement(firstNode)
            ? new VList(firstNode)
            : createVListFromItemNode(firstNode);

        nodes.forEach(node => {
            if (isListElement(node)) {
                vList.mergeVList(new VList(node));
            } else {
                vList.appendItem(node, ListType.None);
            }
        });
    }

    return vList;
}

function tryIncludeSiblingNode(region: Region, nodes: Node[], isNext: boolean) {
    let node = nodes[isNext ? nodes.length - 1 : 0];
    node = region.getLeafSiblingInRegion(node, isNext);
    node = getRootListNode(region, node);

    if (isListElement(node)) {
        if (isNext) {
            nodes.push(node);
        } else {
            nodes.unshift(node);
        }
    }
}

function getRootListNode(region: Region, node: Node): ListElement {
    let list = region.findClosestElementAncestor(node, ListSelector) as ListElement;

    if (list) {
        let ancestor: ListElement;
        while (
            (ancestor = region.findClosestElementAncestor(
                list.parentNode,
                ListSelector
            ) as ListElement)
        ) {
            list = ancestor;
        }
    }

    return list;
}

function createVListFromItemNode(node: Node): VList {
    // Create a temporary OL root element for this list.
    const listNode = node.ownerDocument.createElement('ol'); // Either OL or UL is ok here
    node.parentNode?.insertBefore(listNode, node);

    // Create the VList and append items
    const vList = new VList(listNode);
    vList.appendItem(node, ListType.None);

    return vList;
}
