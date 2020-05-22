import createListSections, { SectionType } from '../utils/createListSections';
import { ChangeSource, Indentation } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';
import { getTagOfNode, splitBalancedNodeRange, toArray, unwrap, wrap } from 'roosterjs-editor-dom';

/**
 * Set indentation at selection
 * If selection contains bullet/numbering list, increase/decrease indentation will
 * increase/decrease the list level by one.
 * @param editor The editor instance
 * @param indentation The indentation option:
 * Indentation.Increase to increase indentation or Indentation.Decrease to decrease indentation
 */
export default function setIndentation(editor: Editor, indentation: Indentation) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        const regions = editor.getSelectedRegions();
        regions.forEach((region) => {
            const sections = createListSections(region);

            sections.forEach((section) => {
                if (section.type == SectionType.VList) {
                    section.vList.setIndentation(start, end, indentation);
                    section.vList.writeBack();
                } else {
                    const blockElements = section.blockElements;
                    if (indentation == Indentation.Increase) {
                        const startNode = blockElements[0].getStartNode();
                        const endNode = blockElements[blockElements.length - 1].getEndNode();
                        const nodes = editor.collapseNodes(
                            startNode,
                            endNode,
                            true /*canSplitParent*/
                        );
                        const quote = wrap(nodes, 'blockquote');
                        quote.style.marginTop = '0px';
                        quote.style.marginBottom = '0px';
                    } else {
                        blockElements.forEach((blockElement) => {
                            let node = blockElement.collapseToSingleElement();
                            const quote = editor.getElementAtCursor('blockquote', node);
                            if (quote) {
                                if (node == quote) {
                                    node = wrap(toArray(node.childNodes));
                                }

                                while (
                                    editor.contains(node) &&
                                    getTagOfNode(node) != 'BLOCKQUOTE'
                                ) {
                                    node = splitBalancedNodeRange(node);
                                }

                                if (editor.contains(node)) {
                                    unwrap(node);
                                }
                            }
                        });
                    }
                }
            });
        });

        editor.select(start, end);
    }, ChangeSource.Format);
}
