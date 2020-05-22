import { findClosestElementAncestor } from 'roosterjs-editor-dom';
import { isListElement, VList } from 'roosterjs-editor-dom';
import { Region } from 'roosterjs-editor-types';

type ListElement = HTMLOListElement | HTMLUListElement;

export default function createVListFromNode(
    region: Region,
    node: Node,
    getTopLevelList?: boolean
): VList {
    let list = !node
        ? null
        : isListElement(node)
        ? node
        : (getAncestorListInRegion(region, node) as ListElement);

    if (list) {
        if (getTopLevelList) {
            let ancestor: ListElement;
            while ((ancestor = getAncestorListInRegion(region, list.parentNode) as ListElement)) {
                list = ancestor;
            }
        } else {
            while (region.contains(list.parentNode) && isListElement(list.parentNode)) {
                list = list.parentNode;
            }
        }
    }

    return list && new VList(list);
}

function getAncestorListInRegion(region: Region, node: Node): ListElement {
    const result = findClosestElementAncestor(node, null /*root*/, 'ol,ul') as ListElement;
    return region.contains(result) ? result : null;
}
