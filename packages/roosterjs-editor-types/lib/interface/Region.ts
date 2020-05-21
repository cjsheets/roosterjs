import BlockElement from './BlockElement';
import IContentTraverser from './IContentTraverser';

export default interface Region {
    createContentTraverser(): IContentTraverser;
    containsBlock(block: BlockElement): boolean;
}
