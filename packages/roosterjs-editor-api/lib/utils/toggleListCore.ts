import { BlockElement, ChangeSource } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';
import { getTagOfNode, ListType, VList, wrap } from 'roosterjs-editor-dom';

const enum SectionType {
    VList,
    Nodes,
}

interface SectionBase<T extends SectionType> {
    type: T;
}

interface VListSection extends SectionBase<SectionType.VList> {
    vList: VList;
}

interface NodesSection extends SectionBase<SectionType.Nodes> {
    nodes: Node[];
}

type Section = VListSection | NodesSection;

export default function toggleListCore(editor: Editor, listType: ListType) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        let vList: VList = null;
        if (start.equalTo(end)) {
            vList = editor.getVList();

            if (vList) {
                vList.changeListType(start, end, listType);
            } else {
                const [prevVList, currentBlock] = getSiblingVList(editor, false /*isNext*/);
                const [nextVList] = getSiblingVList(editor, true /*isNext*/);

                if (prevVList?.getRootListType() === listType) {
                    vList = prevVList;
                    vList.appendListItem(currentBlock.collapseToSingleElement(), listType);
                } else if (currentBlock) {
                    const li = wrap(currentBlock.collapseToSingleElement(), 'li');
                    vList = new VList(wrap(li, getListNodeTag(listType)));
                }

                if (vList && nextVList?.getRootListType() === listType) {
                    vList.mergeVList(nextVList);
                }
            }
        } else {
            vList = getListFromSelectionRange(editor, listType);
            vList?.changeListType(start, end, listType);
        }

        vList?.writeBack();
        editor.select(start, end);
    }, ChangeSource.Format);
}

function getSiblingVList(editor: Editor, isNext: boolean): [VList, BlockElement] {
    const traverser = editor.getBodyTraverser(editor.getFocusedPosition().node);
    const currentBlock = traverser?.currentBlockElement;
    const block = isNext ? traverser?.getNextBlockElement() : traverser?.getPreviousBlockElement();
    const topList = block && getTopListElement(editor, block.getStartNode());
    return [topList && new VList(topList), currentBlock];
}

function getTopListElement(editor: Editor, node: Node): HTMLOListElement | HTMLUListElement {
    let parent: Node;
    while (!!(parent = editor.getElementAtCursor('ol,ul', node.parentNode))) {
        node = parent;
    }

    const tag = getTagOfNode(node);
    return tag == 'OL' || tag == 'UL' ? (node as HTMLOListElement | HTMLUListElement) : null;
}

function createVlistFromNodes(editor: Editor, nodes: Node[], listType: ListType): VList {
    const balancedNodes = editor.collapseNodes(
        nodes[0],
        nodes[nodes.length - 1],
        true /*canSplitParent*/
    );
    const firstNode = balancedNodes[0];
    const listNode = editor.getDocument().createElement(getListNodeTag(listType));
    firstNode.parentNode.insertBefore(listNode, firstNode);
    const vList = new VList(listNode);
    balancedNodes.forEach((node) => vList.appendListItem(node, listType, 0));

    return vList;
}

function getListNodeTag(listType: ListType): 'ol' | 'ul' {
    return listType == ListType.Ordered ? 'ol' : 'ul';
}

function getListFromSelectionRange(editor: Editor, listType: ListType): VList {
    const sections: Section[] = [];
    const traverser = editor.getSelectionTraverser();
    let block = traverser?.currentBlockElement;

    while (block) {
        let lastSection = sections[sections.length - 1];
        const startNode = block.getStartNode();
        const currentVList = editor.getVList(startNode);

        if (currentVList) {
            if (
                !lastSection ||
                lastSection.type != SectionType.VList ||
                !lastSection.vList.contains(startNode)
            ) {
                sections.push({
                    type: SectionType.VList,
                    vList: currentVList,
                });
            }
        } else {
            if (!lastSection || lastSection.type != SectionType.Nodes) {
                lastSection = {
                    type: SectionType.Nodes,
                    nodes: [],
                };
                sections.push(lastSection);
            }

            lastSection.nodes.push(block.collapseToSingleElement());
        }

        block = traverser.getNextBlockElement();
    }

    return sections.reduce((vList, section) => {
        const currentVList =
            section.type == SectionType.VList
                ? section.vList
                : createVlistFromNodes(editor, section.nodes, listType);

        if (vList) {
            vList.mergeVList(currentVList);
        } else {
            vList = currentVList;
        }

        return vList;
    }, <VList>null);
}
