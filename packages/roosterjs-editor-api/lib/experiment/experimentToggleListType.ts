import { ChangeSource, ListType } from 'roosterjs-editor-types';
import { createVListFromRegion } from 'roosterjs-editor-dom';
import { Editor } from 'roosterjs-editor-core';

/**
 * @internal
 */
export default function experimentToggleListType(editor: Editor, listType: ListType) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        const regions = editor.getSelectedRegions();

        regions.forEach(region => {
            const vList = createVListFromRegion(region);
            if (vList) {
                vList.changeListType(start, end, listType);
                vList.writeBack();
            }
        });

        editor.select(start, end);
    }, ChangeSource.Format);
}
