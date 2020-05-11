import { ChangeSource, DocumentCommand, Indentation, QueryScope } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';

/**
 * Set indentation at selection
 * If selection contains bullet/numbering list, increase/decrease indentation will
 * increase/decrease the list level by one.
 * @param editor The editor instance
 * @param indentation The indentation option:
 * Indentation.Increase to increase indentation or Indentation.Decrease to decrease indentation
 */
export default function setIndentation(editor: Editor, indentation: Indentation) {
    editor.addUndoSnapshot((start, end) => {
        editor.focus();
        const vList = editor.getVList();
        let newNode: Node = null;

        if (vList) {
            vList.setIndentation(start, end, indentation);
            vList.writeBack();
            editor.select(start, end);
        } else {
            let command: DocumentCommand.Indent | DocumentCommand.Outdent =
                indentation == Indentation.Increase
                    ? DocumentCommand.Indent
                    : DocumentCommand.Outdent;

            // No existing list node, browser will create <Blockquote> node for indentation.
            // We need to set top and bottom margin to 0 to avoid unnecessary spaces
            editor.getDocument().execCommand(command, false, null);
            editor.queryElements('BLOCKQUOTE', QueryScope.OnSelection, (node) => {
                newNode = newNode || node;
                node.style.marginTop = '0px';
                node.style.marginBottom = '0px';
            });
        }

        return newNode;
    }, ChangeSource.Format);
}
