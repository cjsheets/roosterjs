import createVListFromNode from './createVListFromNode';
import { BlockElement, IContentTraverser } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';
import { VList } from 'roosterjs-editor-dom';

/**
 * @internal
 */
export const enum SectionType {
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

/**
 * @internal
 */
export type Section = VListSection | BlockElementSection;

/**
 * @internal
 */
export default function createListSections(
    editor: Editor,
    traverser: IContentTraverser
): Section[] {
    const sections: Section[] = [];
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
