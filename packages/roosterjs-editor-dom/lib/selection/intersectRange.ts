import createRange from './createRange';
import Position from './Position';

export default function intersectRange(range1: Range, range2: Range): Range {
    if (!range1 || !range2) {
        return null;
    }

    const start1 = Position.getStart(range1).normalize();
    const start2 = Position.getStart(range2).normalize();
    const end1 = Position.getEnd(range1).normalize();
    const end2 = Position.getEnd(range2).normalize();
    const startResult = start1.equalTo(start2) || start1.isAfter(start2) ? start1 : start2;
    const endResult = end1.equalTo(end2) || end1.isAfter(end2) ? end2 : end1;
    return startResult.isAfter(endResult) ? null : createRange(startResult, endResult);
}
