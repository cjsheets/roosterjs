import { Editor } from 'roosterjs-editor-core';
import { isListElement, VList } from 'roosterjs-editor-dom';

type ListElement = HTMLOListElement | HTMLUListElement;

export default function createVListFromNode(
    editor: Editor,
    node: Node,
    getTopLevelList?: boolean
): VList {
    let list = !node
        ? null
        : isListElement(node)
        ? node
        : (editor.getElementAtCursor('ol,ul', node) as ListElement);

    if (list) {
        if (getTopLevelList) {
            let ancestor: HTMLOListElement | HTMLUListElement | HTMLQuoteElement;
            while (
                (ancestor = editor.getElementAtCursor('ol,ul', list.parentNode) as ListElement)
            ) {
                list = ancestor;
            }
        } else {
            while (editor.contains(list.parentNode) && isListElement(list.parentNode)) {
                list = list.parentNode;
            }
        }
    }

    return list && new VList(list);
}
