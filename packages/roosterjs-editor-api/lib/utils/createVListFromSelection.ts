import { BlockElement, Region } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';
import { isListElement, VList } from 'roosterjs-editor-dom';

const enum SectionType {
    VList,
    BlockElement,
}

interface SectionBase<T extends SectionType> {
    type: T;
}

interface VListSection extends SectionBase<SectionType.VList> {
    vList: VList;
}

interface BlockElementSection extends SectionBase<SectionType.BlockElement> {
    blockElements: BlockElement[];
}

type Section = VListSection | BlockElementSection;

/**
 * @internal
 */
export default function createVListFromSelection(editor: Editor, region: Region): VList {
    const sections = createListSections(editor, region);
    const vListBefore = getSiblingVList(editor, sections, region, false /*isNext*/);
    const vListAfter = getSiblingVList(editor, sections, region, true /*isNext*/);

    if (vListAfter) {
        sections.push({ type: SectionType.VList, vList: vListAfter });
    }

    return sections.reduce((vList, section) => {
        let currentVList = section.type == SectionType.VList ? section.vList : null;

        if (!currentVList && section.type == SectionType.BlockElement) {
            const nodes = section.blockElements.map(e => e.collapseToSingleElement());

            currentVList = VList.createFromNodes(
                editor.collapseNodes(nodes[0], nodes[nodes.length - 1], true /*canSplitParent*/)
            );
        }

        if (vList) {
            vList.mergeVList(currentVList);
        } else {
            vList = currentVList;
        }

        return vList;
    }, vListBefore);
}

/**
 * @internal
 */
export function runWithMultipleListSections(
    editor: Editor,
    region: Region,
    vListCallback: (vList: VList) => any,
    blockElementCallback: (blockElements: BlockElement[]) => any
) {
    const sections = createListSections(editor, region);

    sections.forEach(section => {
        if (section.type == SectionType.VList && vListCallback) {
            vListCallback(section.vList);
        } else if (section.type == SectionType.BlockElement && blockElementCallback) {
            blockElementCallback(section.blockElements);
        }
    });
}

function createListSections(editor: Editor, region: Region): Section[] {
    const sections: Section[] = [];
    const traverser = editor.getSelectionTraverser(region);
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
            if (!lastSection || lastSection.type != SectionType.BlockElement) {
                lastSection = {
                    type: SectionType.BlockElement,
                    blockElements: [],
                };
                sections.push(lastSection);
            }

            lastSection.blockElements.push(block);
        }

        block = traverser.getNextBlockElement();
    }

    return sections.filter(
        section =>
            (section?.type === SectionType.VList && !!section.vList) ||
            (section?.type === SectionType.BlockElement && section.blockElements.length > 0)
    );
}

type ListElement = HTMLOListElement | HTMLUListElement;

function createVListFromNode(editor: Editor, node: Node, getTopLevelList?: boolean): VList {
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

function getSiblingVList(editor: Editor, sections: Section[], region: Region, isNext: boolean) {
    const node = getFirstOrLastNodeOfSections(sections, isNext /*isLast*/);

    if (!node) {
        return null;
    }

    const traverser = editor.getBodyTraverser(node);
    const block = isNext ? traverser?.getNextBlockElement() : traverser?.getPreviousBlockElement();
    return (
        region.contains(block) &&
        createVListFromNode(editor, block.getStartNode(), true /*getTopLevelList*/)
    );
}

function getFirstOrLastNodeOfSections(sections: Section[], isLast: boolean): Node {
    const section = sections[isLast ? sections.length - 1 : 0];

    if (!section) {
        return null;
    } else if (section.type == SectionType.VList) {
        return section.vList.getFirstOrLastNode(isLast);
    } else {
        const blockElement = section.blockElements[isLast ? section.blockElements.length - 1 : 0];
        return blockElement && (isLast ? blockElement.getEndNode() : blockElement.getStartNode());
    }
}
