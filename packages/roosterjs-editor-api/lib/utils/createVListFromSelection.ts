import { Editor } from 'roosterjs-editor-core';
import { isListElement, VList } from 'roosterjs-editor-dom';

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

export default function createVListFromSelection(editor: Editor): VList {
    const range = editor.getSelectionRange();

    if (!range) {
        return null;
    }
    const sections: Section[] = [];
    const traverser = editor.getSelectionTraverser(range);
    let block = traverser?.currentBlockElement;

    while (block) {
        let lastSection = sections[sections.length - 1];
        const startNode = block.getStartNode();
        const currentVList = createVListFromNode(editor, startNode);

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

    return [
        <VListSection>{
            type: SectionType.VList,
            vList: getSiblingVList(editor, sections, false /*isNext*/),
        },
        ...sections,
        <VListSection>{
            type: SectionType.VList,
            vList: getSiblingVList(editor, sections, true /*isNext*/),
        },
    ]
        .filter(
            (section) =>
                section &&
                ((section.type == SectionType.VList && !!section.vList) ||
                    (section.type == SectionType.Nodes && section.nodes.length > 0))
        )
        .reduce((vList, section) => {
            const currentVList =
                section.type == SectionType.VList
                    ? section.vList
                    : VList.createFromNodes(
                          editor.collapseNodes(section.nodes, true /*canSplitParent*/)
                      );

            if (vList) {
                vList.mergeVList(currentVList);
            } else {
                vList = currentVList;
            }

            return vList;
        }, <VList>null);
}

export function createVListFromNode(editor: Editor, node: Node, getTopLevelList?: boolean): VList {
    let list = !node
        ? null
        : isListElement(node)
        ? node
        : (editor.getElementAtCursor('ol, ul', node) as HTMLOListElement | HTMLUListElement);

    if (list) {
        if (getTopLevelList) {
            let ancestor: HTMLOListElement | HTMLUListElement;
            while (
                (ancestor = editor.getElementAtCursor('ol, ul', list.parentNode) as
                    | HTMLOListElement
                    | HTMLUListElement)
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

function getSiblingVList(editor: Editor, sections: Section[], isNext: boolean) {
    const node = getFirstOrLastNodeOfSections(sections, isNext /*isLast*/);
    const traverser = editor.getBodyTraverser(node);
    const block = isNext ? traverser?.getNextBlockElement() : traverser?.getPreviousBlockElement();
    return block && createVListFromNode(editor, block.getStartNode(), true /*getTopLevelList*/);
}

function getFirstOrLastNodeOfSections(sections: Section[], isLast: boolean): Node {
    const section = sections[isLast ? sections.length - 1 : 0];
    return section
        ? section.type == SectionType.Nodes
            ? section.nodes[isLast ? section.nodes.length - 1 : 0]
            : section.vList.getFirstOrLastNode(isLast)
        : null;
}
