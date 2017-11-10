/**
 * Copyright: ThoughtSpot Inc. 2016
 * Author: Ashish Shubham (ashish@thoughtspot.com)
 *
 * @fileoverview Utils to manage caret in the tokenizer.
 */
import * as rangy from 'rangy';
import 'rangy/lib/rangy-textrange';
import { Key } from 'w3c-keys';
import {browserName, Browsers} from './browser';

export {Key};

let isChrome: boolean = browserName === Browsers.Chrome;

let rangyOptions = {
    wordOptions: {
        wordRegex: /([a-z0-9 ]+('[a-z0-9 ]+)*)/gi
    },
    characterOptions: {
        ignoreCharacters: String.fromCharCode(8203)
    }
};

export let navigational = new Set<string>([
    Key.ArrowUp,
    Key.ArrowDown,
    Key.ArrowLeft,
    Key.ArrowRight,
    Key.Left,
    Key.Right,
    Key.Up,
    Key.Down
]);

let triggerDropdownKey = new Set<string>([
    Key.ArrowUp,
    Key.ArrowDown,
]);

export let classes = {
    SEPARATOR: 'separator',
    TOKEN: 'token',
    EDITED: 'bk-edited-node',
    COLLAPSED: 'collapsed',
    INCOMPLETE: 'incomplete',
    NO_ANIMATION: 'no-animation',
    REMOVED: 'removed',
    EXTENSIBLE: 'extensible',
    TOKENIZER: 'tokenizer',
    EDITED_LEFT_SIBLING: 'edited-left',
    EDITED_LEFT_LEFT_SIBLING: 'edited-left-left'
};

let removeButtonRect = {
    top: 10,
    right: 3,
    left: 14,
    bottom: 10
};

/**
 * @type Position
 */
export interface Position {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

export function isCaretAtTheEndOfCompleteToken(extensibleAsIncomplete: boolean = false): boolean {
    let [textToken, isAtEnd] = getCaretTokenAndIsAtEndBoundary();
    let incompleteDueToExtensibility = extensibleAsIncomplete
        && textToken.classList.contains(classes.EXTENSIBLE);

    if(!textToken.classList.contains(classes.INCOMPLETE)
        && textToken.classList.contains(classes.TOKEN)
        && !incompleteDueToExtensibility
        && isAtEnd) {
        return true;
    }
    return false;
}

function getCaretTokenAndIsAtEndBoundary(): [HTMLElement, boolean] {
    let sel = rangy.getSelection();
    let text:any = sel.baseNode || sel.anchorNode;
    if(!text) {
        return [null, false];
    }
    let textToken, isAtEnd;
    // AnchorNode could either be a token, or the text inside
    // the token.
    if(text.nodeName === '#text') {
        // token is the parent element of the text node.
        textToken = text.parentNode;
        isAtEnd = sel.anchorOffset === text.length;
    } else {
        textToken = text;
        // Text is the child of the token.
        text = textToken.firstChild;
        isAtEnd = sel.anchorOffset === textToken.childNodes.length;
    }

    return [textToken, isAtEnd];
}

export function isCaretAtEndBoundary() : boolean {
    let [textToken, isAtEnd] = getCaretTokenAndIsAtEndBoundary();
    return isAtEnd || isCaretOnEmptySeparator(null, textToken);
}

export function isCaretAtBeginBoundary() : boolean {
    let sel = rangy.getSelection();
    let node: any = sel.baseNode || sel.anchorNode;
    let isAtBegin = sel.anchorOffset === 0;
    node = (node.nodeName === '#text') ? node.parentElement : node;
    return isAtBegin || isCaretOnEmptySeparator(null, node);
}

export function isRangeSelection() {
    let selection = rangy.getSelection();
    return selection.focusNode !== selection.anchorNode;
}

export function isCaretOnSeparator(container, targetNode = getCaretNode(container)): boolean {
    if(!targetNode) {
        return false;
    }
    let targetClass = targetNode.classList && targetNode.classList[0];
    return targetClass === classes.SEPARATOR;
}

export function isCaretOnEmptySeparator(container, targetNode = getCaretNode(container)): boolean {
    if(!targetNode) {
        return false;
    }
    let targetClass = targetNode.classList && targetNode.classList[0];
    let isEmpty = targetNode.textContent === String.fromCharCode(8203)
        || !targetNode.hasChildNodes();
    return targetClass === classes.SEPARATOR
        && isEmpty;
}

export function isCaretAtTheEndOfInput(container, caretNode = getCaretNode(container)) {
    return container.lastChild === caretNode;
}

function getClosestElementNode(node, parentNode) {
    let sibling = node.previousElementSibling;
    if(sibling) {
        return sibling;
    }
    return parentNode;
}

export function getCaretNode(container): HTMLElement {
    let sel = window.getSelection();
    let node = sel.baseNode || sel.anchorNode;
    if(!node) {
        return null;
    }

    if(node === container) {
        node = container.lastChild || container;
    }

    if(node.nodeName === '#text') {
        let parentNode = node.parentNode;
        if(parentNode === container) {
            node = getClosestElementNode(node, parentNode);
        } else {
            node = parentNode;
        }
    }

    return <HTMLElement>node;
}

export function isCaretInContainer(container: HTMLElement): boolean {
    let sel = rangy.getSelection();
    let node = sel.baseNode || sel.anchorNode;
    return container.contains(node) ||
        container.contains(node.parentNode);
}

export function getCaretPosition(container: HTMLElement): number {
    let sel = getSelection();
    if(sel.rangeCount === 0) {
        return null;
    }
    let range = sel.getRangeAt(0);
    let endContainer = range.endContainer.nodeName === '#text'
        ? range.endContainer.parentNode
        : range.endContainer;
    let endOffset = (range.endContainer.nodeName !== '#text' && range.endOffset > 0)
        ? range.endContainer.textContent.length
        : range.endOffset;
    if(shouldDoSeparatorAllowance(endContainer)) {
        endOffset++;
    }
    let children = container.children;
    let child = children[0];
    let i = 0, pos = 0;
    while(child !== endContainer && i < children.length) {
        let contentLength = child.textContent.length;
        if(shouldDoSeparatorAllowance(child)) {
            contentLength++;
        }
        pos += contentLength;
        child = children[++i] ;
    }
    return pos + endOffset;
}

function shouldDoSeparatorAllowance(node) {
    return isChrome
        && node.classList && node.classList.contains(classes.SEPARATOR);
}

export function saveSelection(element) {
    return getCaretPosition(element);
}

export function restoreSelection(element, offset) {
    let range = document.createRange();
    let sel = window.getSelection();

    //select appropriate node
    let currentNode = null;
    let previousNode = null;

    for (let i = 0; i < element.childNodes.length; i++) {
        //save previous node
        previousNode = currentNode;

        //get current node
        currentNode = element.childNodes[i];
        //if we get span or something else then we should get child node
        while(currentNode.childNodes.length > 0) {
            currentNode = currentNode.childNodes[0];
        }

        //calc offset in current node
        if (previousNode !== null) {
            let previousLength = (shouldDoSeparatorAllowance(previousNode))
                ? 1
                : previousNode.length || 0;
            offset -= previousLength;
        }
        //check whether current node has enough length
        if (offset <= currentNode.length) {
            break;
        }
    }
    //move caret to specified offset
    if (currentNode !== null) {
        if(shouldDoSeparatorAllowance(currentNode)) {
            offset = 0;
        }
        range.setStart(currentNode, offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function moveCaret(moveUnits: number = 1) {
    return () => {
        let sel = rangy.getSelection();
        sel.move('character', moveUnits);
    };
}

let moveCursorOutFromTokenEndActions = {
    [Browsers.Chrome]: () => {
        // Chrome's separators are empty so rangy's
        // character movements do not work.
        let sel = rangy.getSelection();
        let anchorNode = sel.anchorNode;
        let currentToken = (anchorNode.nodeName === '#text')
            ? anchorNode.parentNode
            : anchorNode;
        if (sel.rangeCount) {
            let range = sel.getRangeAt(0);
            range.collapse(false);
            range.collapseAfter(currentToken);
            sel.setSingleRange(range);
        }
    },
    [Browsers.IE]: moveCaret(1),
    others: moveCaret(2)
};

export let moveCursorOutFromTokenEnd = moveCursorOutFromTokenEndActions[browserName]
    || moveCursorOutFromTokenEndActions.others;

let moveCursorIntoTokenEndActions = {
    [Browsers.Chrome]: () => {
        // Chrome's separators are empty so rangy's
        // character movements do not work.
        let range = document.createRange();
        let sel = window.getSelection();
        let targetNode: any = sel.baseNode || sel.anchorNode;
        targetNode = targetNode.previousSibling;
        if(targetNode) {
            range.setStartAfter(targetNode);
            range.setEnd(targetNode, targetNode.length || targetNode.childNodes.length);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    },
    [Browsers.Firefox]: () => {
        let sel = rangy.getSelection();
        sel.move('character', -1, rangyOptions);
    },
    others: () => {
        let sel = rangy.getSelection();
        sel.move('character', -1);
    }
};

export let moveCursorIntoTokenEnd
               = moveCursorIntoTokenEndActions[browserName]
    || moveCursorIntoTokenEndActions.others;

export function putCaretOnNodeStart(node) {
    let range = rangy.createRange();
    range.selectNodeContents(node);
    let sel = rangy.getSelection();
    sel.setSingleRange(range);
}

export function setCaretAtNodeOffset(node, offset = 0) {
    node = getTextChild(node);
    let range = rangy.createRange();
    range.setStartAndEnd(node, offset);
    let sel = rangy.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

export function removeCursor() {
    let sel = window.getSelection();
    sel.removeAllRanges();
}
export function simulateMousedown(target: HTMLElement) {
    let evt = document.createEvent('MouseEvents');
    evt.initMouseEvent('mousedown', true, true, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null);
    target.dispatchEvent(evt);
}

export function moveCursorToTheEndOfInput(container: Node) {
    //Create a range (a range is a like the selection but invisible)
    let range = document.createRange();
    //Select the entire contents of the element with the range
    range.selectNodeContents(container);
    //collapse the range to the end point. false means collapse to end rather than the start
    range.collapse(false);
    //get the selection object (allows you to change selection)
    let selection = window.getSelection();
    //remove any selections already made
    selection.removeAllRanges();
    //make the range you have just created the visible selection
    selection.addRange(range);
}

export function getNodeCoordinate(container: Element,
                                  node: Element): Position {
    let containerRect = container.getBoundingClientRect();
    let nodeRect = node.getBoundingClientRect();
    let topCoord = nodeRect.top - containerRect.top;
    let leftCoord = nodeRect.left - containerRect.left;

    let coord = {
        top: topCoord,
        left: leftCoord,
        bottom: topCoord + nodeRect.height,
        right: leftCoord + nodeRect.width
    };
    return coord;
}

export function isWithinRemoveButton(e: MouseEvent) {
    let target: any = e.target;
    let targetBoundingRect = target.getBoundingClientRect();
    // Check if the `cross` button was clicked. 'x' is an pseudo-element
    // thus we do the calculation below, as pseudo elems cant recieve click.
    // This was done to reduce number of elements in the DOM.
    return e.clientX > targetBoundingRect.right - removeButtonRect.left &&
        e.clientX < targetBoundingRect.right + removeButtonRect.right &&
        e.clientY < targetBoundingRect.top +  removeButtonRect.bottom &&
        e.clientY > targetBoundingRect.top - removeButtonRect.top;
}

export function moveCursorToEndOfToken(container: Node) {
    this.moveCursorToTheEndOfInput(container);
}

export function isNavigational(e: KeyboardEvent) {
    return navigational.has(e.key);
}

export function isRight(e: KeyboardEvent) {
    return e.key === Key.ArrowRight || e.key === Key.Right;
}


export function isLeft(e: KeyboardEvent) {
    return e.key === Key.ArrowLeft || e.key === Key.Left;
}

export function isBackspace(e: KeyboardEvent): boolean {
    return e.key === Key.Backspace;
}

export function isEnter(e: KeyboardEvent): boolean {
    return e.key === Key.Enter;
}

export function isUpOrDown(e: KeyboardEvent) {
    return triggerDropdownKey.has(e.key);
}

export function isEscape(e: KeyboardEvent) {
    return e.key === Key.Escape;
}

export function isSpace(e: KeyboardEvent) {
    return e.key === Key.Space;
}

export function isDelete(e: KeyboardEvent) {
    return e.key === Key.Delete;
}

export function isRemoveType(e: KeyboardEvent) {
    return e.key === Key.Delete
        || e.key === Key.Backspace;
}

export function addEventListener(el: HTMLElement,
                                 events: string | string[],
                                 handler: (Event) => void) {
    if(typeof events === 'string') {
        events = events.split(' ');
    }

    events.forEach(event => el.addEventListener(event, handler));
}

/**
 * Do a task asyncronously as a MacroTask with the promise API.
 * https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
 *
 * @param task
 * @returns {Promise<TResult2|TResult1>}
 */
export function doAsyncMacrotask(task: () => any): Promise<any> {
    return new Promise((resolve) => {
        setTimeout(resolve);
    }).then(task);
}

function getTextChild(node) {
    if(node.nodeName === '#text') {
        return node;
    }

    return getTextChild(node.firstChild);
}
