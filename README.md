# tokenizer.js
[![Build Status](https://travis-ci.org/ashubham/tokenizer.js.svg?branch=master)](https://travis-ci.org/ashubham/tokenizer.js)
[![Coverage Status](https://coveralls.io/repos/github/ashubham/tokenizer.js/badge.svg)](https://coveralls.io/github/ashubham/tokenizer.js)

A modern async text tokenizer, for the modern web. [Demo](https://codepen.io/ashubham/pen/xPJMwa?editors=0100)

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
```html
<div id="input" contenteditable></div>
```
```javascript
import {Tokenizer} from 'tokenizer.js';

let el = document.getElementById('input');
let tokenizer = new Tokenizer(el /* Target element */, {
        onChange: () => {
            // return a Promise resolving to 
            // tokens.
        }
    }
);
```

## Demos

- [Simple](https://codepen.io/ashubham/pen/LOBObN?editors=0010)
- [Custom Tokens](https://codepen.io/ashubham/pen/xPJMwa?editors=0100)

## Config Options

```typescript
 let tokenizer = new Tokenizer(el, {
    initialInput: [], //  Initial token state, when the Tokenizer is initialized, this shows up as initial tokens.

    isFocused: false, //Flag to indicate whether the tokenizer is in focus when initialized.


    // A callback called whenever the text in the tokenizer is changed. 
    //This should return a Promise resolving to the new tokenization state.
    onChange: (inputText: string, caretPosition: number, isCaretOnSeparator?: boolean) => {
        return new Promise<DisplayToken[]>();
    },

    // Callback called on each keydown inside the tokenizer.
    // Return `false` to stop propagation.
    onKeyDown: (event: KeyboardEvent) => true,

    // Callback called when focus state of the tokenizer is changed. 
    // The param `isFocused` indicates the new focus state.
    onFocusChanged: (isFocused: boolean) => void,

    // Callback called when wrapping state of the tokenizer changes. 
    // The param `isWrapped` represents whether the tokenizer is wrapping.
    onWrap: (isWrapped: boolean) => void,

    // Callback called when the caret position is changed. 
    // For eg. using arrow keys, backspace, click etc.
    onCaretPositionChanged: (inputText: string, caretPosiotion: number, isCaretOnSeparator: boolean) => void,

    // Callback called when a token is hovered over.
    onMouseOverToken: (tokenIndex: number, e: MouseEvent) => void,

    // Callback called when the user stop hovering over any tokens.
    onMouseOutTokenizer: () => void
 })
```

## Public Methods

```typescript
let tokenizer = new Tokenizer(el, config);

// Clear the tokenizer text.
tokenizer.clear();

// Blur the tokenizer (loose focus).
tokenizer.blur();

// Get coords of the token having the caret.
tokenizer.getCaretTokenPosition(); // {x: 50, y: 80} For eg.

// Gets the position of the token at [idx] index.
tokenizer.getTokenPosition(idx: number);

// Replace the text of the tokenizer with new text.
// This is followed by a automatic reTokenization.
tokenizer.updateText(text: string);

// Update the tokenizer display with a new set of `tokens`,
// puts the caret after `caretTokenIdx` token,
// if `reTokenization=true` reTokenization will follow.
tokenizer.updateDisplay(tokens: DisplayToken[], caretTokenIdx: number, reTokenization: bool);

// Gets the text equivalent of the tokenizer.
tokenizer.getInnerText() // 'Some string user entered'

// Whether the tokenizer has focus.
tokenizer.hasFocus() // true

// Gets the number of tokens.
tokenizer.getNumTokens() // 4

// Sets the caret at the start of the `idx` index token.
tokenizer.selectNodeByIdx(idx: number);
```

 ### DisplayToken

 This is a structure which represents a token. Its an object
 with these properties:

 Prop name | type | description
 --- | --- | ---
 `value` | `string` | The text value of the token.
 `className` | `string` | The css class name to be applied to the token, the consumer can apply styles under this css class.
 `isIncomplete` | `bool` | Boolean flag to indicate whether the token is complete.
 `isExtensible` | `bool` | Flag to indicate whether the token is extensible, if true, cursor is not moved out of it on completion.

    