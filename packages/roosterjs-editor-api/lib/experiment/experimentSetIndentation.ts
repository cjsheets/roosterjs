import { BlockElement, ChangeSource, Indentation, Region } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';
import {
    createVListFromRegion,
    getTagOfNode,
    splitBalancedNodeRange,
    toArray,
    unwrap,
    wrap,
} from 'roosterjs-editor-dom';

const BlockWrapper = '<blockquote style="margin-top:0;margin-bottom:0"></blockquote>';

/**
 * Set indentation at selection
 * If selection contains bullet/numbering list, increase/decrease indentation will
 * increase/decrease the list level by one.
 * @param editor The editor instance
 * @param indentation The indentation option:
 * Indentation.Increase to increase indentation or Indentation.Decrease to decrease indentation
 */
export default function experimentSetIndentation(editor: Editor, indentation: Indentation) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        const regions = editor.getSelectedRegions();
        regions.forEach(region => {
            const blocks = region.getSelectedBlockElements();
            const blockGroups: BlockElement[][] = [[]];

            for (let i = 0; i < blocks.length; i++) {
                const startNode = blocks[i].getStartNode();
                const vList = createVListFromRegion(region, startNode);

                if (vList) {
                    blockGroups.push([]);
                    while (blocks[i + 1] && vList.contains(blocks[i + 1].getStartNode())) {
                        i++;
                    }
                    vList.setIndentation(start, end, indentation);
                    vList.writeBack();
                } else {
                    blockGroups[blockGroups.length - 1].push(blocks[i]);
                }
            }

            const handler = indentation == Indentation.Increase ? indent : outdent;
            blockGroups.forEach(group => handler(region, group));
        });

        editor.select(start, end);
    }, ChangeSource.Format);
}

function indent(region: Region, blocks: BlockElement[]) {
    if (blocks.length > 0) {
        const startNode = blocks[0].getStartNode();
        const endNode = blocks[blocks.length - 1].getEndNode();
        const nodes = region.collapseNodes([startNode, endNode]);
        wrap(nodes, BlockWrapper);
    }
}

function outdent(region: Region, blocks: BlockElement[]) {
    blocks.forEach(blockElement => {
        let node = blockElement.collapseToSingleElement();
        const quote = region.findClosestElementAncestor(node, 'blockquote');
        if (quote) {
            if (node == quote) {
                node = wrap(toArray(node.childNodes));
            }

            while (region.contains(node) && getTagOfNode(node) != 'BLOCKQUOTE') {
                node = splitBalancedNodeRange(node);
            }

            if (region.contains(node)) {
                unwrap(node);
            }
        }
    });
}
