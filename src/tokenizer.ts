/**
 * Author: Ashish Shubham (ashubham@gmail.com)
 *
 * @fileoverview Dynamic Tokenizer Component.
 *
 * This tokenizer component listens to typed text, and tokenizes it based on supplied
 * callback (onChange).
 *
 * It accepts a config of callbacks and flags.
 * And provides a public API.
 */

import {isFinite,
     isFunction,
     debounce,
     chain,
     escape} from 'lodash';
import { Observable } from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/debounceTime';

import {
    caretOnEmptySeparatorHandler,
    changeEventName,
    getTokenTemplate,
    handleBrowserKeydownQuirks, initTokenTpl,
    separatorTemplate, shouldReplaceNWSP, typingDebounce
} from './tokenizer-browser-quirks';
import {
    DisplayToken,
    TokenizerConfig,
    defaultConfig
} from './tokenizer-config';
import * as utils from './tokenizer-utils';

export let classes = utils.classes;
export {DisplayToken, TokenizerConfig} from './tokenizer-config';

export class Tokenizer {
    public isFocused: boolean;
    private editedNode: Element;
    private _innerHtml: string = '';
    private innerText: string;
    private hasWrapped: boolean;
    private config: TokenizerConfig;
    private subscriptions: Subscription[] = [];
    private isComposingIME: boolean = false;

    private get innerHtml(): string {
        return this._innerHtml;
    }

    private set innerHtml(value: string) {
        this._innerHtml = value;
        this.el.innerHTML = value;
        this.innerText = this.getInnerText();
    }

    constructor(private el: HTMLElement, config: TokenizerConfig) {
        this.el.classList.add(classes.TOKENIZER);
        this.config = Object.assign({}, defaultConfig, config);
        this.tokenizeDisplay(this.config.initialInput, true);
        this.setupEventListeners();
        this.setHasWrapped();
        if(this.config.isFocused) {
            setTimeout(() => {
                this.el.focus();
                this.onEmptyInputClicked();
            });
        }
    }

    /**
     * Gets the node coordinates of the token which currently
     * contains the caret.
     *
     * @returns {Position}
     */
    public getCaretTokenPosition(): utils.Position {
        let caretNode = utils.getCaretNode(this.el);
        if(!caretNode) {
            return null;
        }
        return utils.getNodeCoordinate(this.el, caretNode);
    }

    /**
     * Gets the position of the token at [idx] index.
     *
     * @param idx
     * @returns {Position}
     */
    public getTokenPosition(idx: number): utils.Position {
        let node = this.findContentNodeAtIndex(idx);
        if (!node) {
            return null;
        }
        return utils.getNodeCoordinate(this.el, node);
    }

    /**
     * Clear the tokenizer text.
     */
    public clear() {
        this.innerHtml = initTokenTpl;
        utils.moveCursorToTheEndOfInput(this.el);
        this.config.onChange('', 0, false);
    }

    /**
     * Replace the text of the tokenizer with new text,
     * this is followed by a reTokenization.
     *
     * @param fullSearchText
     */
    public updateText(fullText: string) {
        this.innerHtml = fullText;
        utils.removeCursor();
        this.refreshTokens(fullText);
        this.el.blur();
    }

    /**
     * Update the tokenizer display with a new set of tokens.
     *
     * @param tokens
     * @param caretTokenIdx {number} Where to put caret.
     * @param refreshTokens {boolean} Whether to reTokenize
     */
    public updateDisplay(tokens: DisplayToken[],
                         tokenIdx: number = null,
                         refreshTokens: boolean = false) {

        this.tokenizeDisplay(tokens);
        let fullText = tokens.map(t => t.value).join(' ');
        if(tokenIdx >= 0) {
            this.putCaretAfterTokenIndex(tokenIdx);
        }
        // we need to manage caret position restoration
        if(refreshTokens) {
            this.refreshTokens(fullText);
        }
    }

    /**
     * Gets the text equivalent of the tokenizer. Santizes it to remove
     * spurious linebreaks.
     *
     * @returns {string}
     */
    public getInnerText(): string {
        let children = this.el.children;
        let text;
        if(children.length) {
            // Using lodash's lazy loading capability here. Basically creating a pipeline
            // instead of iterating the array multiple times.
            // http://filimanjaro.com/blog/2014/introducing-lazy-evaluation/
            text = chain(children)
                .map(t => t.textContent)
                .filter(text => !!text && text !== String.fromCharCode(8203))
                .join(' ')
                .replace(/\s/g, ' ')
                .value();
        } else {
            text = this.el.textContent;
        }
        return (shouldReplaceNWSP) ? text.replace(/\u200B/g, '') : text;
    }

    public destroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
    }

    public hasFocus(): boolean {
        return this.el.contains(document.activeElement);
    }

    public blur(): void {
        this.el.blur();
        this.setEditedNode(undefined);
    }

    public getNumTokens(): number {
        return this.el.children.length;
    }

    public selectNodeByIdx(idx: number, offset: number = 0) {
        let target = this.findContentNodeAtIndex(idx);
        utils.setCaretAtNodeOffset(target, offset);
        this.setEditedNodeWithCaretChange(target);
        this.config.onFocusChanged(true);
    }

    private async refreshTokens(
                queryText: string) {
        let caretPosition = utils.getCaretPosition(this.el);
        let tokens = await this.config.onChange(
            queryText,
            caretPosition || 0,
            caretPosition > 0 && utils.isCaretOnSeparator(this.el));
        this.tokenizeDisplay(tokens);
        if(this.hasFocus()) {
            this.setEditedNode(utils.getCaretNode(this.el));
        }
    }

    private setupEventListeners() {
        this.setupOnChange();
        this.setupKeydown();
        this.setupHover();
        this.setupMousedown();
        this.setupBlur();
        this.setupPaste();
        this.setupIMEComposition();
        this.setupResizingWrapCheck();
    }
    private setupOnChange() {
        let keyups = Observable
            .fromEvent(this.el, changeEventName)
            .filter(e => !this.isComposingIME)
            // switchMap handles cancellation semantics of inflight requests.
            // tslint:disable-next-line:max-line-length
            // http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-switchMap
            .switchMap(
                (inputHtml: string, idx: number) => {
                    let queryText = this.getInnerText();
                    let caretPosition = utils.getCaretPosition(this.el);
                    // Calling onChange for each keyUp which changes the input text.
                    // Doing this as an Async task, to avoid blocking UI thread on
                    // any heavy operation onChange might do synchronously (read serialization).
                    // Also adding a timer here to prevent continuous requests when keys like
                    // backspace are kept pressed. Or typing too fast.
                    return Observable.timer(typingDebounce)
                        .flatMap(() => utils.doAsyncMacrotask(() => {
                            return this.config.onChange(queryText, caretPosition);
                        }));
                }
            )
            .subscribe((tokens) => {
                this.tokenizeDisplay(tokens);
                let caretNode = utils.getCaretNode(this.el);
                this.setEditedNode(caretNode);
                if(utils.isCaretOnSeparator(this.el, caretNode)) {
                    this.onCaretPositionChanged();
                }
            });

        this.subscriptions.push(keyups);
    }
    private setupKeydown() {
        let blurOnEnterOrEscape =(e: KeyboardEvent) => {
            if(utils.isEnter(e)|| utils.isEscape(e)) {
                this.el.blur();
                e.preventDefault();
                e.stopPropagation();
            }
        };

        let handleKeyPressesOnSeparator = debounce((e: KeyboardEvent) => {
            // Delete/Backspace when caret is on an empty separator has a
            // special behavior. Backspace => 'left' (instead of 'delete').
            // But if there is a selection of tokens in the search bar,
            // we want to have default 'delete' behaviour for those keypresses.
            if(utils.isCaretOnEmptySeparator(this.el) && !utils.isRangeSelection()) {
                if(utils.isRemoveType(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    //Backspace on separator considered left-arrow key.
                    if(utils.isBackspace(e)) {
                        utils.moveCursorIntoTokenEnd();
                        this.setEditedNodeWithCaretChange();
                    }
                }

                if(caretOnEmptySeparatorHandler) {
                    caretOnEmptySeparatorHandler(this.el, e);
                }
            }
        }, 100, {leading: true});

        let handleSpacesAtTokenEndings =(e: KeyboardEvent) => {
            if(utils.isSpace(e) && utils.isCaretAtTheEndOfCompleteToken()) {
                e.preventDefault();
                e.stopPropagation();
                utils.moveCursorOutFromTokenEnd();
                this.setEditedNodeWithCaretChange();
            }
        };

        let keydowns = Observable
            .fromEvent(this.el, 'keydown')
            .filter(e => !this.isComposingIME)
            // Filter if supplied handler returns false.
            .filter((e: KeyboardEvent) => this.config.onKeyDown(e))
            .filter((e: KeyboardEvent) => keysWithSpecialHandling.has(e.key))
            // if user presses enter/esc just blur.
            // Propagation stopped to prevent browser from moving the Caret.
            .do(blurOnEnterOrEscape)
            // Backspace on separator is treated like left-arrow key.
            // This prevent tokens from sticking to each other.
            .do(handleKeyPressesOnSeparator)
            // Space at the end of complete tokens are treated like
            // a right arrow.
            .do(handleSpacesAtTokenEndings)
            .do((e: KeyboardEvent) => handleBrowserKeydownQuirks(this.el, e))
            .debounceTime(200)
            .do((e: KeyboardEvent) => {
                if(utils.isNavigational(e)) {
                    this.setEditedNodeWithCaretChange();
                }
            })
            .subscribe(() => {
                // Empty, needed just to have the Observable chain execute.
            });
        this.subscriptions.push(keydowns);
    }
    private setupHover() {
        if(isFunction(this.config.onMouseOverToken)) {
            let mouseoverSubscription = Observable
                .fromEvent(this.el, 'mouseover')
                .map((e: any) => {
                    return [
                        parseInt(e.target.dataset.tokenIndex),
                        e
                    ];
                })
                .filter(([tokenIndex, e]) => isFinite(tokenIndex))
                .subscribe(([tokenIndex, e]) => {
                    this.config.onMouseOverToken(tokenIndex, e);
                });
            this.subscriptions.push(mouseoverSubscription);
        }
        if(isFunction(this.config.onMouseOutTokenizer)) {
            let mouseoutSubscription = Observable
                .fromEvent(this.el, 'mouseout')
                .subscribe((e: MouseEvent) => {
                    this.config.onMouseOutTokenizer();
                });
            this.subscriptions.push(mouseoutSubscription);
        }
    }
    private setupMousedown() {
        let mouseDownSubscription = Observable
            .fromEvent(this.el, 'mousedown')
            .subscribe((e: MouseEvent) => {
                let target: EventTarget | any = e.target;

                // This is the case when, user click on the empty portion
                // of the tokenizer bar.
                if(target === this.el) {
                    return this.onEmptyInputClicked();
                }

                // Target is a token.
                if (target.nodeName === 'DIV' || target.nodeName === 'SPAN') {
                    if (utils.isWithinRemoveButton(e)) {
                        // Remove the token after doing the transition.
                        target.classList.add(classes.REMOVED);
                        let nextSibling = target.nextElementSibling;
                        if(nextSibling && nextSibling.className === classes.SEPARATOR) {
                            nextSibling.remove();
                        }
                        e.stopPropagation();
                        e.preventDefault();
                        target.addEventListener('transitionend', (e: TransitionEvent) => {
                            if(e.propertyName === 'max-width') {
                                target.remove();
                                let newQuery = this.getInnerText();
                                this.innerText = newQuery;
                                this.refreshTokens(newQuery);
                                this.setHasWrapped();
                            }
                        });
                    } else {
                        // The cross(x) button was not clicked, The token was clicked.
                        setTimeout(() => {
                            this.setEditedNodeWithCaretChange(target);
                            this.config.onFocusChanged(true);
                        });
                    }
                }
            });
        this.subscriptions.push(mouseDownSubscription);
    }
    private setupBlur() {
        let blurSubscription = Observable
            .fromEvent(this.el, 'blur')
            .subscribe((evt) => {
                this.setHasWrapped();
                this.config.onFocusChanged(false);
                this.setEditedNode(undefined);
            });
        this.subscriptions.push(blurSubscription);
    }
    private setupPaste() {
        let pasteSubscription = Observable
            .fromEvent(this.el, 'paste')
            .subscribe((e: ClipboardEvent) => {
                e.preventDefault();
                e.stopPropagation();
                let pastedQuery = e.clipboardData.getData('text/plain');
                // If the pasted query contains line breaks, they are converted to spaces.
                pastedQuery = pastedQuery
                    .replace(/\n/g, ' ')
                    .trim();
                document.execCommand('insertText', false, pastedQuery);
            });
        this.subscriptions.push(pasteSubscription);
    }
    private setupIMEComposition() {
        let imeStartSubscription = Observable
            .fromEvent(this.el, 'compositionstart')
            .subscribe(e => this.isComposingIME = true);
        this.subscriptions.push(imeStartSubscription);

        let imeEndSubscription = Observable
            .fromEvent(this.el, 'compositionend')
            .subscribe(e => {
                this.isComposingIME = false;
                let newQuery = this.getInnerText();
                this.innerText = newQuery;
                this.refreshTokens(newQuery);
            });
        this.subscriptions.push(imeEndSubscription);
    }
    private setupResizingWrapCheck() {
        let resizeSubscription = Observable
            .fromEvent(window, 'resize')
            .debounceTime(60)
            .subscribe(() => {
                this.setHasWrapped();
            });
        this.subscriptions.push(resizeSubscription);
    }

    private onEmptyInputClicked() {
        // We move the cursor to the end of the last element.
        utils.moveCursorToEndOfToken(this.el.lastChild || this.el);
        this.setEditedNode(utils.getCaretNode(this.el), true);
        this.onCaretPositionChanged();
        return this.config.onFocusChanged(true);
    }
    private getContentNodes(): Element[] {
        return Array.from(this.el.children).filter((e) => {
            return e.className !== classes.SEPARATOR;
        });
    }

    private findContentNodeAtIndex(idx: number): Element {
        return this.getContentNodes()[idx];
    }

    private putCaretAfterTokenIndex(idx) {
        let contentNode = this.findContentNodeAtIndex(idx);
        if(!contentNode) {
            return;
        }
        let separator = contentNode.nextElementSibling;
        if(separator && separator.classList.contains(classes.SEPARATOR)) {
            utils.putCaretOnNodeStart(separator);
        } else {
            // This is the case where the token is incomplete type.
            utils.moveCursorToEndOfToken(contentNode);
        }
    }

    private tokenizeDisplay(tokens: DisplayToken[],
                            doNotRestoreCaret: boolean = false) {
        let savedSel;
        let styledText = this.classify(tokens);
        if(styledText === this.el.innerHTML.replace(' edited', '')) {
            return;
        }
        doNotRestoreCaret = doNotRestoreCaret
            || !this.hasFocus()
            || !utils.isCaretInContainer(this.el);

        if(!doNotRestoreCaret) {
            savedSel = utils.saveSelection(this.el);
        }
        this.innerHtml = styledText;
        if(savedSel) {
            let searchQuery = tokens.map(token => token.value).join(' ');
            if(tokens.length && !tokens[tokens.length - 1].isIncomplete) {
                searchQuery = searchQuery.trim();
            }
            let isFixed = false; // Whether the saved caret position needed to be fixed.
            ({savedSel, isFixed} = this.fixSavedSelection(savedSel, searchQuery));
            utils.restoreSelection(this.el, savedSel);
            // In case the caret was fixed, trailing spaces were removed due to a sage
            // call. We do not consider extendible tokens in that case, as the user had
            // spaces after the concerned token.
            if(utils.isCaretAtTheEndOfCompleteToken(!isFixed)) {
                utils.moveCursorOutFromTokenEnd();
            }
        }
    }

    /**
     * In some cases savedSelection's caret position may be more
     * than the length of the text, especially in the cases of deletions,
     * this method fixes that inconsistency.
     *
     * @param savedSel
     * @param searchQuery
     * @returns {any}
     */
    private fixSavedSelection(savedSel, searchQuery) {
        let isFixed = false;
        let queryLength = searchQuery.length;
        if(savedSel > queryLength) {
            savedSel = queryLength;
            isFixed = true;
        }
        return {savedSel, isFixed};
    }

    /**
     * Sets the current node being edited. Sets a class on the edited
     * node for styling purposes.
     *
     * @param node
     * @param skipCallback [boolean] Whether to call the registered callback.
     *
     */
    private setEditedNode(node: Element,
                          doNotAnimate: boolean = false) {
        if(node === this.editedNode) {
             return;
        }
        if(this.editedNode) {
            this.editedNode.classList.remove(classes.EDITED, classes.NO_ANIMATION);
        }
        this.editedNode = node;
        if(node) {
            if(doNotAnimate) {
                node.classList.add(classes.NO_ANIMATION);
            }
            node.classList.add(classes.EDITED);
        }
    }

    private onCaretPositionChanged() {
        let caretPosition = utils.getCaretPosition(this.el);
        let query = this.innerText;
        this.config.onCaretPositionChanged(query,
            caretPosition,
            utils.isCaretOnSeparator(this.el));
    }

    private setEditedNodeWithCaretChange(node: Element = utils.getCaretNode(this.el),
                                         doNotAnimate?: boolean) {
        this.setEditedNode(node, doNotAnimate);
        this.onCaretPositionChanged();
    }

    private getNumHiddenTokens(): number {
        let invisibleItems = [];
        let children = this.el.children;
        for(let i=0; i < this.el.childElementCount; i++) {
            let child: any = children[i];
            if (child.offsetTop + child.offsetHeight >
                this.el.offsetTop + this.el.offsetHeight ||
                child.offsetLeft + child.offsetWidth >
                this.el.offsetLeft + this.el.offsetWidth ) {

                invisibleItems.push(child);
            }

        }
        return invisibleItems.length;
    }

    private setHasWrapped() {
        let hasWrapped: boolean;
        let firstChild:any = this.el.firstElementChild;
        let lastChild:any = this.el.lastElementChild;
        if(!firstChild || !lastChild) {
            hasWrapped = false;
        } else {
            hasWrapped =
                firstChild.offsetTop + 1 < lastChild.offsetTop;
        }

        if(this.hasWrapped !== hasWrapped) {
            this.config.onWrap(hasWrapped);
            this.hasWrapped = hasWrapped;
        }
    }

    /**
     * This method accepts an array of tokens and converts them to markup.
     * Basically putting respective classes in the DIV elements.
     *
     * @param tokenized
     * @returns {string}
     */
    private classify(tokenized: DisplayToken[]): string {
        if(!tokenized.length) {
            return initTokenTpl;
        }
        return tokenized
            .map((t: DisplayToken, i) => {
                let tokenClass = `${classes.TOKEN} ${t.className}`;
                let value = escape(t.value);
                tokenClass += (t.isExtensible) ? ` ${classes.EXTENSIBLE}` : ``;
                if(t.isIncomplete) {
                    tokenClass = `${tokenClass} ${classes.INCOMPLETE}`;
                    return getTokenTemplate(i, tokenClass, value);
                }
                let token = getTokenTemplate(i, tokenClass, value);
                return token + separatorTemplate;
            })
            .join('')
            ;
    }
}

let keysWithSpecialHandling = new Set([
    utils.Key.Space,
    utils.Key.Backspace,
    utils.Key.Delete,
    utils.Key.Enter,
    utils.Key.Escape,
    ...Array.from(utils.navigational)
]);
