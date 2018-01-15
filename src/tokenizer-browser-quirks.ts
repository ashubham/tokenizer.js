/**
 * Author: Ashish Shubham (ashubham@gmail.com)
 *
 * @fileoverview Contains browser specific quirk handler for the tokenizer.
 */
import {browserName, Browsers} from './browser';
import * as utils from './tokenizer-utils';

let classes = utils.classes;

/**
 * Keydown Quirks
 */
let edgeCaretManager = (container, e) => {
    if(utils.isRight(e)
        && !utils.isCaretAtTheEndOfInput(container)
        && utils.isCaretAtEndBoundary()) {
        utils.moveCursorOutFromTokenEnd();
    }

    if(utils.isLeft(e) && utils.isCaretAtBeginBoundary()) {
        utils.moveCursorIntoTokenEnd();
    }
};
let keydownQuirksHandlers = {
    [Browsers.Edge]: edgeCaretManager
};
export function handleBrowserKeydownQuirks(container, e: KeyboardEvent) {
    let handler = keydownQuirksHandlers[browserName];
    if(handler) {
        return keydownQuirksHandlers[browserName](container, e);
    }
}

export function emptySeparatorHandler(container, e) {
    if(utils.isLeft(e)) {
        utils.moveCursorIntoTokenEnd();
    } else if(utils.isRight(e) && !utils.isCaretAtTheEndOfInput(container)) {
        utils.moveCursorOutFromTokenEnd();
    }
}

let browserCaretOnEmptySeparatorHandlers = {
    [Browsers.Firefox]: emptySeparatorHandler,
    [Browsers.Safari]: emptySeparatorHandler
};

export const caretOnEmptySeparatorHandler = browserCaretOnEmptySeparatorHandlers[browserName];
/**
 * Separator templates for browser type.
 */
let separatorTemplates = {
    [Browsers.Chrome]: `<div class="${classes.SEPARATOR}"></div>`,
    [Browsers.IE]: `<span class="separator">&#8203;</span>`
};
let tpl = separatorTemplates[browserName];
if(!tpl) {
    tpl = `<div class="${classes.SEPARATOR}">&#8203;</div>`;
}
export const separatorTemplate = tpl;

let initTokenTpls = {
    [Browsers.IE]: `<span class="init-token"></span>`
};
export const initTokenTpl = initTokenTpls[browserName] || `<div class="init-token"></div>`;


/**
 * Token Template for browser type.
 * @param {number} idx
 * @param {string} tokenClass
 * @param {string} value
 */
let tokenTemplate = (idx: number, tokenClass: string, value: string) =>
    `<div data-token-index="${idx}" class="${tokenClass}">${value}</div>`;
if(browserName === Browsers.IE) {
    tokenTemplate = (idx, tokenClass, value) =>
        `<span data-token-index="${idx}" class="${tokenClass}">${value}</span>`;
}
export const getTokenTemplate = tokenTemplate;

/**
 * Typing request Debounce
 *
 * Done to account for slower browser.
 */
let debounceTimes = {
    [Browsers.IE]: 200,
    [Browsers.Chrome]: 50,
    [Browsers.Safari]: 50,
    [Browsers.Firefox]: 50,
    [Browsers.Edge]: 100,
    [Browsers.Phantom]: 50
};
export let typingDebounce = debounceTimes[browserName] || 50;

let changeEvents = {
    [Browsers.IE]: 'DOMCharacterDataModified'
};
export const changeEventName = changeEvents[browserName] || 'input';

const browsersWithNWSPSeparator = new Set<Browsers>([
    Browsers.Firefox,
    Browsers.Safari,
    Browsers.Edge,
    Browsers.IE
 ]);

export const shouldReplaceNWSP = browsersWithNWSPSeparator.has(browserName);
