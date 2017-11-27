# tokenizer.js
[![Build Status](https://travis-ci.org/ashubham/tokenizer.js.svg?branch=master)](https://travis-ci.org/ashubham/tokenizer.js)
[![Coverage Status](https://coveralls.io/repos/github/ashubham/tokenizer.js/badge.svg)](https://coveralls.io/github/ashubham/tokenizer.js)

A modern async text tokenizer, for the modern web.

![](https://github.com/ashubham/tokenizer.js/raw/master/assets/tokenizer.gif)

## Features

- Pure Javascript (No JQuery/Frameworks).
- Based on Reactive Streams (RxJS).
- Fully Async, get tokenization using REST calls.
- Written in TypeScript (types bundled).
- Battle tested on all modern browsers (and IE11).
- Fully customizable using CSS.
- Hooks and callbacks included.

## Usage
```javascript
import {Tokenizer} from 'tokenizer.js';

let el = document.getElementById('input');
let tokenizer = new Tokenizer(
    el, // Target element
    // Configuration options/callbacks.
    // [Look below](#Config Options) for the full list.
    {
        onChange: () => {
            // return a Promise resolving to 
            // tokens<DisplayToken>.
        }
    }
);
```

## Demos

- [Simple](https://codepen.io/ashubham/pen/LOBObN?editors=0010)
- [Custom Tokens](https://codepen.io/ashubham/pen/xPJMwa?editors=0100)

## Public Methods

Method | Description
--- | --- 
clear () | Clear tokenizer text.
blur () | Blur the tokenizer (loose focus).
getCaretTokenPosition () | Get coords of the token having the caret.
getTokenPosition (idx: number) | Gets the position of the token at [idx] index.
updateText(text: string) | Replace the text of the tokenizer with new text, this is followed by a reTokenization.
updateDisplay (tokens: DisplayToken[], caretTokenIdx: number, refreshTokens: bool) | Update the tokenizer display with a new set of `tokens`, puts the caret after `caretTokenIdx` token, if `refreshTokens=true` reTokenization will follow.
getInnerText (): string | Gets the text equivalent of the tokenizer. Santizes it to remove spurious linebreaks.
hasFocus (): bool | Whether the tokenizer has focus.
getNumTokens (): number | Gets the number of tokens
selectNodeByIdx (idx: number) | Sets the caret at the start of the `idx` index token.

## Config Options

Option Name | Type | Description
--- | --- | ---
initialInput | [DisplayToken[]](#displaytoken)| Initial token state, when the Tokenizer is initialized, this shows up as initial tokens.
isFocused | bool | Flag to indicate whether the tokenizer is in focus when initialized.
onChange | (inputText: `string`, caretPosition: `number`, isCaretOnSeparator?: `boolean`) => PromiseLike<[DisplayToken](#displaytoken)[]> | A callback called whenever the text in the tokenizer is changed. This should return a Promise resolving to the new tokenization state.
onKeyDown | (event: KeyboardEvent) => bool | Callback called on each keydown inside the tokenizer. Return `false` to stop propagation.
onFocusChanged | (isFocused: boolean) => void | Callback called when focus state of the tokenizer is changed. The param `isFocused` indicates the new focus state.
onWrap | (isWrapped: boolean) => void | Callback called when wrapping state of the tokenizer changes. The param `isWrapped` represents whether the tokenizer is wrapping.
 onCaretPositionChanged | `(inputText: string, caretPosiotion: number, isCaretOnSeparator: boolean) => void` | Callback called when the caret position is changed. For eg. using arrow keys, backspace, click etc.
 onMouseOverToken | (tokenIndex, e) => void | Callback called when a token is hovered over.
 onMouseOutTokenizer | () => void | Callback called when the user stop hovering over any tokens.

 ### DisplayToken

 This is a structure which represents a token. Its an object
 with these properties:

 Prop name | type | description
 --- | --- | ---
 value | string | The text value of the token.
 className | string | The css class name to be applied to the token, the consumer can apply styles under this css class.
 isIncomplete | bool | Boolean flag to indicate whether the token is complete.
 isExtensible | bool | Flag to indicate whether the token is extensible, if true, cursor is not moved out of it on completion.

    