import getListTypeFromNode from './getListTypeFromNode';
import { ListType } from 'roosterjs-editor-types';

/**
 * Check if the given DOM node is a list element (OL or UL)
 * @param node The node to check
 */
export default function isListElement(node: Node): node is HTMLUListElement | HTMLOListElement {
    return getListTypeFromNode(node) != ListType.None;
}
