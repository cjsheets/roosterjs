import createVListFromNode from './createVListFromNode';
import { BlockElement, Region } from 'roosterjs-editor-types';
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
export default function createListSections(region: Region): Section[] {
    const sections: Section[] = [];
    const blocks = region.getBlockElementsInSelection();

    blocks.forEach((block) => {
        let lastSection = sections[sections.length - 1];
        const startNode = block.getStartNode();
        const currentVList = createVListFromNode(region, startNode);

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
    });

    return sections.filter(
        (section) =>
            (section?.type === SectionType.VList && !!section.vList) ||
            (section?.type === SectionType.BlockElement && section.blockElements.length > 0)
    );
}
