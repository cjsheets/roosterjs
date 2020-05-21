import createMergedVList from '../utils/createMergedVList';
import { ChangeSource, ListType } from 'roosterjs-editor-types';
import { Editor } from 'roosterjs-editor-core';

/**
 * Toggle bullet at selection
 * If selection contains bullet in deep level, toggle bullet will decrease the bullet level by one
 * If selection contains number list, toggle bullet will convert the number list into bullet list
 * If selection contains both bullet/numbering and normal text, the behavior is decided by corresponding
 * browser execCommand API
 * @param editor The editor instance
 */
export default function toggleBullet(editor: Editor) {
    editor.focus();
    editor.addUndoSnapshot((start, end) => {
        const regions = editor.getSelectedRegions();

        regions.forEach(region => {
            const vList = createMergedVList(editor, region);
            if (vList) {
                vList.changeListType(start, end, ListType.Unordered);
                vList.writeBack();
            }
        });

        editor.select(start, end);
    }, ChangeSource.Format);
}
