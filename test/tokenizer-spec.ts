/**
 * Copyright: ThoughtSpot Inc. 2017
 * Author: Ashish Shubham (ashish@thoughtspot.com)
 *
 * @fileoverview Tests for Tokenizer Widget.
 */
import rangy from 'rangy';
import {Key} from 'w3c-keys';
import {Tokenizer, TokenizerConfig} from './tokenizer';
import * as utils from './tokenizer-utils';

let defaultConfig: TokenizerConfig = {
    initialInput: [{
        value: 'token1',
        className: 'class1',
        isIncomplete: false,
        isExtensible: false
    }, {
        value: 'token2',
        className: 'class2',
        isIncomplete: false,
        isExtensible: false
    }],
    onChange: (str, position) => Promise.resolve([]),
    onKeyDown: (evt) => true,
    isFocused: true,
    onFocusChanged: (isChanged) => {/**/},
    onWrap: (isChanged) => {/**/},
    onCaretPositionChanged: (str, pos, is) => {/**/}
};

describe('Tokenizer', () => {
    let config: TokenizerConfig,
        $el: HTMLElement;

    beforeEach(() => {
        config = Object.assign({}, defaultConfig);
        if ($el) {
            document.body.removeChild($el);
        }
        $el = document
            .createElement('div');
        $el.setAttribute('contenteditable', 'true');
        $el.setAttribute('style', 'position:relative;display:flex;');
        document.body.appendChild($el);
    });

    it('On init should focus when config isFocused=true', (done) => {
        config.isFocused = true;
        spyOn(config, 'onFocusChanged').and.callFake(() => done());
        let tok = new Tokenizer($el, config);
    });

    it('On init should set the initial tokens', () => {
        let tok = new Tokenizer($el, config);
        expect(tok.getInnerText()).toEqual('token1 token2');
    });

    it('on init should not save caret position', () => {
        spyOn(utils, 'saveSelection');
        let tok = new Tokenizer($el, config);
        expect(utils.saveSelection).not.toHaveBeenCalled();
    });

    it('updateText Should update the Text', (done) => {
        spyOn(config, 'onChange').and.returnValue(Promise.resolve([{
            value: 'token3',
            className: 'class3',
            isIncomplete: false
        }, {
            value: 'token4',
            className: 'class4',
            isIncomplete: false
        }]));
        let tok = new Tokenizer($el, config);
        let updatedText = 'token3 token4';
        tok.updateText(updatedText);
        expect(config.onChange).toHaveBeenCalledWith(
            updatedText, 0, false);
        let interval = setInterval(() => {
            expect(tok.getInnerText()).toEqual(updatedText);
            clearInterval(interval);
            done();
        }, 100);
    });

    it('clear Should clear the Text', (done) => {
        spyOn(config, 'onChange').and.returnValue(Promise.resolve([]));
        let tok = new Tokenizer($el, config);
        tok.clear();
        expect(config.onChange).toHaveBeenCalledWith('', 0, false);
        let interval = setInterval(() => {
            expect(tok.getInnerText()).toEqual('');
            clearInterval(interval);
            done();
        }, 100);
    });

    it('updateDisplay should update the display text, and put caret', () => {
        let tok = new Tokenizer($el, config);
        tok.updateDisplay([
            {value:'tok1', className:'c1', isIncomplete: false, isExtensible: false},
            {value: 'tok2', className:'c2', isIncomplete: false, isExtensible: false}
        ], 0, false);
        expect(tok.getInnerText()).toEqual('tok1 tok2');
    });

    it('selectNodeByIdx should put caret at the offset of that node', () => {
        spyOn(config, 'onCaretPositionChanged');
        let tok = new Tokenizer($el, config);
        tok.selectNodeByIdx(0, 3);
        expect(config.onCaretPositionChanged).toHaveBeenCalledWith(
            'token1 token2',
            3,
            false
        );

        tok.selectNodeByIdx(1, 3);
        expect(config.onCaretPositionChanged).toHaveBeenCalledWith(
            'token1 token2',
            3,
            false
        );
    });

    it('Should not process keydowns already handled by callback', () => {
        spyOn(config, 'onKeyDown').and.returnValue(false);
        spyOn(utils, 'isEnter');
        let tok = new Tokenizer($el, config);
        let evt = new KeyboardEvent('keydown', { key: Key.Enter });
        $el.dispatchEvent(evt);
        expect(config.onKeyDown).toHaveBeenCalledWith(evt);
        expect(utils.isEnter).not.toHaveBeenCalled();
    });

    it('Should blur on Enter/Esc', () => {
        config.isFocused = true;
        spyOn($el, 'blur');
        let tok = new Tokenizer($el, config);
        let evt = new KeyboardEvent('keydown', { key: Key.Enter });
        $el.dispatchEvent(evt);
        expect($el.blur).toHaveBeenCalled();
    });

    it('On <space> at the end of complete token, move caret out to the separator', (done) => {
        spyOn(utils, 'moveCursorOutFromTokenEnd').and.callFake(done);
        spyOn(utils, 'isCaretAtTheEndOfCompleteToken').and.returnValue(true);
        config.isFocused = false;
        let tok = new Tokenizer($el, config);
        let evt = new KeyboardEvent('keydown', { key: Key.Space });
        $el.dispatchEvent(evt);
    });

    it('On <bckspce> in between tokens, should move to previous tokens and not delete', (done) => {
        spyOn(utils, 'moveCursorIntoTokenEnd').and.callFake(() => {
            expect(evt.preventDefault).toHaveBeenCalled();
            done();
        });
        spyOn(utils, 'isCaretOnEmptySeparator').and.returnValue(true);
        config.isFocused = false;
        let tok = new Tokenizer($el, config);
        let evt = new KeyboardEvent('keydown', { key: Key.Backspace });
        spyOn(evt, 'preventDefault');
        $el.dispatchEvent(evt);
    });

    it('On <bckspce> on a selection, should delete selection', () => {
        let tok = new Tokenizer($el, config);

        let range = rangy.createRange();
        range.selectNode($el);
        let tokens = $el.childNodes;
        for (let i = 0; i < tokens.length; ++i) {
            range.insertNode(tokens[i]);
        }
        range.setStart($el.firstChild, 0);
        range.setEnd($el.lastChild, 0);
        let selection = rangy.getSelection();
        selection.setSingleRange(range);

        spyOn(utils, 'isCaretOnEmptySeparator').and.returnValue(true);
        let evt = new KeyboardEvent('keydown', { key: Key.Backspace });
        spyOn(evt, 'preventDefault');
        $el.dispatchEvent(evt);
        expect(evt.preventDefault).not.toHaveBeenCalled();
    });
});
