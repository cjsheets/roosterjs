import createListSections, { Section, SectionType } from './createListSections';
import createVListFromNode from './createVListFromNode';
import { Region } from 'roosterjs-editor-types';
import { VList } from 'roosterjs-editor-dom';

/**
 * @internal
 */
export default function createMergedVList(region: Region): VList {
    const sections = createListSections(region);
    const vListBefore = getSiblingVList(sections, region, false /*isNext*/);
    const vListAfter = getSiblingVList(sections, region, true /*isNext*/);

    if (vListAfter) {
        sections.push({ type: SectionType.VList, vList: vListAfter });
    }

    return sections.reduce((vList, section) => {
        let currentVList = section.type == SectionType.VList ? section.vList : null;

        if (!currentVList && section.type == SectionType.BlockElement) {
            let nodes: Node[] = section.blockElements.map((e) => e.collapseToSingleElement());
            nodes = region.collapseNodes(nodes);
            currentVList = VList.createFromNodes(nodes);
        }

        if (vList) {
            vList.mergeVList(currentVList);
        } else {
            vList = currentVList;
        }

        return vList;
    }, vListBefore);
}

function getSiblingVList(sections: Section[], region: Region, isNext: boolean) {
    const section = sections[isNext ? sections.length - 1 : 0];

    if (!section) {
        return null;
    }

    let node: Node = null;

    if (section.type == SectionType.VList) {
        node = section.vList.getFirstOrLastNode(isNext);
    } else {
        const block = section.blockElements[isNext ? section.blockElements.length - 1 : 0];
        node = isNext ? block.getEndNode() : block.getStartNode();
    }

    node = region.getLeafSiblingInRegion(node, isNext);

    return node && createVListFromNode(region, node, true /*getTopLevelList*/);
}
