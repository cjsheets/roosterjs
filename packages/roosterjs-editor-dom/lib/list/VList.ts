import changeElementTag from '../utils/changeElementTag';
import contains from '../utils/contains';
import getTagOfNode from '../utils/getTagOfNode';
import isBlockElement from '../utils/isBlockElement';
import isNodeEmpty from '../utils/isNodeEmpty';
import queryElements from '../utils/queryElements';
import splitParentNode from '../utils/splitParentNode';
import toArray from '../utils/toArray';
import unwrap from '../utils/unwrap';
import wrap from '../utils/wrap';
import { Indentation, NodePosition } from 'roosterjs-editor-types';

export const enum ListType {
    Ordered = 1,
    Unordered = 2,
}

export interface ListItem {
    node: Node;
    level: number;
    type: ListType;
}

const orderListStyles = [null, 'lower-alpha', 'lower-roman'];

export default class VList {
    private items: ListItem[] = [];
    private rootList: HTMLOListElement | HTMLUListElement;

    constructor(list: HTMLOListElement | HTMLUListElement) {
        this.rootList = list;

        moveChildNodesToLi(list);
        queryElements(list, 'ol,ul', moveChildNodesToLi);
        queryElements(list, 'li', moveLiToList);

        this.iterateItems(list);
    }

    getRootListType(): ListType {
        return getTagOfNode(this.rootList) == 'UL' ? ListType.Unordered : ListType.Ordered;
    }

    contains(node: Node) {
        return contains(this.rootList, node);
    }

    writeBack() {
        const doc = this.rootList.ownerDocument;
        const fragment = doc.createDocumentFragment();
        let listStack: (HTMLOListElement | HTMLUListElement | DocumentFragment)[] = [fragment];
        let currentType: ListType = null;

        for (let i = 0; i < this.items.length; i++) {
            const { node, level, type } = this.items[i];

            if (listStack.length - 1 != level || currentType != type) {
                // If type is changed, current list node can't be reused, need to create a new one
                listStack = listStack.slice(
                    0,
                    Math.max(currentType == type ? level + 1 : level, 1)
                );
                currentType = type;

                for (let i = listStack.length - 1; i < level; i++) {
                    const newList = doc.createElement(
                        currentType == ListType.Ordered ? 'ol' : 'ul'
                    );

                    if (currentType == ListType.Ordered) {
                        newList.style.listStyle = orderListStyles[i % orderListStyles.length];
                    }

                    listStack[listStack.length - 1].appendChild(newList);
                    listStack.push(newList);
                }
            }

            const list = listStack[listStack.length - 1];
            list.appendChild(node);

            if (level < 1) {
                if (getTagOfNode(node) == 'LI') {
                    changeElementTag(node as HTMLLIElement, 'div');
                } else if (!isBlockElement(node)) {
                    wrap(node);
                }
            }
        }

        this.rootList.parentNode.replaceChild(listStack[0], this.rootList);
        this.rootList = null;
    }

    setIndentation(start: NodePosition, end: NodePosition, indentation: Indentation) {
        const callback = indentation == Indentation.Decrease ? outdentItem : indentItem;
        this.findListItems(start, end, callback);
    }

    changeListType(start: NodePosition, end: NodePosition, targetType: ListType) {
        let hasDifferentTypeOrOutside = false;
        const items: ListItem[] = [];

        this.findListItems(start, end, (item) => {
            items.push(item);
            hasDifferentTypeOrOutside =
                hasDifferentTypeOrOutside || item.level == 0 || item.type != targetType;
        });

        const callback = hasDifferentTypeOrOutside
            ? (item: ListItem) => {
                  item.level = Math.max(item.level, 1);
                  item.type = targetType;
              }
            : outdentItem;

        items.forEach(callback);
    }

    appendListItem(node: Node, type: ListType, level: number = 1) {
        this.items.push({
            node: getTagOfNode(node) == 'LI' ? node : wrap(node, 'li'),
            type,
            level,
        });
    }

    mergeVList(list: VList) {
        const originalLength = this.items.length;
        list.items.forEach((item) => this.items.push(item));
        list.items.splice(0, list.items.length);

        this.mergeOrphanNodesAfter(originalLength - 1);
        list.removeList();
    }

    private removeList() {
        if (this.rootList?.parentNode) {
            this.rootList.parentNode.removeChild(this.rootList);
        }
    }

    private mergeOrphanNodesAfter(startIndex: number) {
        const lastItem = this.items[startIndex];

        if (lastItem && getTagOfNode(lastItem.node) == 'LI') {
            let currentItem: ListItem;
            let i = startIndex + 1;

            while (
                !!(currentItem = this.items[i]) &&
                currentItem.level == lastItem.level &&
                currentItem.type == lastItem.type &&
                getTagOfNode(currentItem.node) != 'LI'
            ) {
                i++;
            }

            if (i > startIndex + 1) {
                const itemsToMove = this.items.splice(startIndex + 1, i - startIndex - 1);
                const nodesToWrap = itemsToMove.map((item) => item.node);
                lastItem.node.appendChild(wrap(nodesToWrap));
            }
        }
    }

    private findListItems(
        start: NodePosition,
        end: NodePosition,
        callback?: (item: ListItem, index: number) => any
    ): { startIndex: number; endIndex: number } {
        const length = this.items.length;
        let startIndex = -1;
        let endIndex = length;
        for (let i = 0; i < length; i++) {
            const node = this.items[i].node;

            if (contains(node, start.node, true /*treatSameNodeAsContain*/)) {
                startIndex = i;
            }
            if (contains(node, end.node, true /*treatSameNodeAsContain*/)) {
                endIndex = i;
            }
        }

        startIndex = endIndex < length ? Math.max(0, startIndex) : startIndex;
        endIndex = startIndex >= 0 ? Math.min(length - 1, endIndex) : endIndex;

        if (endIndex >= startIndex) {
            if (callback) {
                for (let i = startIndex; i <= endIndex; i++) {
                    callback(this.items[i], i);
                }

                this.mergeOrphanNodesAfter(endIndex);
            }
            return { startIndex, endIndex };
        } else {
            return { startIndex: -1, endIndex: -1 };
        }
    }

    private iterateItems(list: HTMLOListElement | HTMLUListElement, level: number = 1) {
        const type = getTagOfNode(list) == 'UL' ? ListType.Unordered : ListType.Ordered;
        for (let item = list.firstChild; !!item; item = item.nextSibling) {
            const tag = getTagOfNode(item);

            if (tag == 'OL' || tag == 'UL') {
                this.iterateItems(item as HTMLOListElement | HTMLUListElement, level + 1);
            } else {
                this.items.push({
                    node: item,
                    level,
                    type,
                });
            }
        }
    }
}

//Normalization

// Step 1: Move all non-LI direct children under list into LI
// e.g.
// From: <ul><li>line 1</li>line 2</ul>
// To:   <ul><li>line 1<div>line 2</div></li></ul>
function moveChildNodesToLi(list: HTMLOListElement | HTMLUListElement) {
    let currentItem: HTMLLIElement = null;
    let currentWrapper: HTMLElement = null;

    toArray(list.childNodes).forEach((child) => {
        if (getTagOfNode(child) == 'LI') {
            currentItem = child as HTMLLIElement;
            currentWrapper = null;
        } else if (isListElement(child)) {
            currentItem = null;
            currentWrapper = null;
        } else if (currentItem && !isNodeEmpty(child, true /*trimContent*/)) {
            if (!currentWrapper) {
                currentWrapper = child.ownerDocument.createElement('div');
                currentItem.appendChild(currentWrapper);
            }
            currentWrapper.appendChild(child);
        }
    });
}

// Step 2: Move nested LI up to under list directly
// e.g.
// From: <ul><li>line 1<li>line 2</li>line 3</li></ul>
// To:   <ul><li>line 1</li><li>line 2<div>line 3</div></li></ul>
function moveLiToList(li: HTMLLIElement) {
    while (!isListElement(li.parentNode)) {
        splitParentNode(li, true /*splitBefore*/);
        let furtherNodes: Node[] = toArray(li.parentNode.childNodes).slice(1);

        if (furtherNodes.length > 0) {
            if (!isBlockElement(furtherNodes[0])) {
                furtherNodes = [wrap(furtherNodes)];
            }
            furtherNodes.forEach((node) => li.appendChild(node));
        }

        unwrap(li.parentNode);
    }
}

function isListElement(node: Node): node is HTMLUListElement | HTMLOListElement {
    const tag = getTagOfNode(node);
    return tag == 'UL' || tag == 'OL';
}

function indentItem(item: ListItem) {
    item.level++;
}

function outdentItem(item: ListItem) {
    if (item.level > 0) {
        item.level--;
    }
}
