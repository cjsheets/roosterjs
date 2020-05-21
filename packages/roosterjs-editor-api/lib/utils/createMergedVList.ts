import createListSections, { Section, SectionType } from './createListSections';
import createVListFromNode from './createVListFromNode';
import { Editor } from 'roosterjs-editor-core';
import { Region } from 'roosterjs-editor-types';
import { VList } from 'roosterjs-editor-dom';

/**
 * @internal
 */
export default function createMergedVList(editor: Editor, region: Region): VList {
    const sections = createListSections(editor, region.createContentTraverser());
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

function getSiblingVList(editor: Editor, sections: Section[], region: Region, isNext: boolean) {
    const node = getFirstOrLastNodeOfSections(sections, isNext /*isLast*/);

    if (!node) {
        return null;
    }

    const traverser = editor.getBodyTraverser(node);
    const block = isNext ? traverser?.getNextBlockElement() : traverser?.getPreviousBlockElement();
    return (
        block &&
        region.containsBlock(block) &&
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
