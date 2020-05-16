import createVListFromSelection from './createVListFromSelection';
import { ChangeSource, ListType } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';

export default function toggleListCore(
    editor: Editor,
    listType: ListType.Ordered | ListType.Unordered
) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        const vList = createVListFromSelection(editor);
        if (vList) {
            vList.changeListType(start, end, listType);
            vList.writeBack();
            editor.select(start, end);
        }
    }, ChangeSource.Format);
}
