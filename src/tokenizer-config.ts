/**
 * Copyright: ThoughtSpot Inc. 2017
 * Author: Ashish Shubham (ashish@thoughtspot.com)
 *
 * @fileoverview Config interface for the tokenizer
 */

export interface DisplayToken {
    /**
     * The text value of the token.
     */
    value: string;
    /**
     * The css class name to be applied to the token,
     * the consumer can apply styles under this css class.
     */
    className: string;
    /**
     * Boolean flag to indicate whether the token is complete.
     */
    isIncomplete: boolean;
    /**
     * Flag to indicate whether the token is extensible,
     * if true, cursor is not moved out of it on completion.
     */
    isExtensible: boolean;
}

export interface TokenizerConfig {
    /**
     * Initial token state, when the Tokenizer is initialized.
     * This shows up as initial tokens.
     */
    initialInput: DisplayToken[];

    /**
     * Flag to indicate whether the tokenizer is in focus when
     * initialized.
     */
    isFocused: boolean;

    /**
     * A callback called whenever the text in the tokenizer is changed.
     * This should return a Promise resolving to the new tokenization state.
     *
     * @param string The new text input.
     * @param number The caret position inside the tokenizer.
     * @returns Promise{Array} The new tokens to display.
     */
    onChange: (inputText: string, caretPosition: number, isCaretOnSeparator?: boolean)
        => PromiseLike<DisplayToken[]>;

    /**
     * Callback called on each keydown inside the tokenizer.
     * Return *false* to stop propagation.
     *
     * @param evt
     * @returns boolean Flag indicating whether to propagate the event further.
     */
    onKeyDown: (evt: KeyboardEvent) => boolean;

    /**
     * Callback called when focus state of the tokenizer is changed.
     * The param indicates the new focus state.
     *
     * @param boolean isFocused
     */
    onFocusChanged: (isFocused: boolean) => void;

    /**
     * Callback called when wrapping state of the tokenizer changes.
     * The param represents whether the tokenizer is wrapping.
     *
     * @param boolean isWrapped.
     */
    onWrap: (isWrapped: boolean) => void;

    /**
     * Callback called when the caret position is changed. For eg.
     * using arrow keys, backspace, click etc.
     *
     * @param inputText [string]
     * @param caretPosiotion [number]
     * @param isCaretOnSeparator [boolean]
     */
    onCaretPositionChanged: (inputText: string,
                             caretPosiotion: number,
                             isCaretOnSeparator: boolean) => void;

    /**
     * Callback called when a token is hovered over.
     *
     * @param tokenIndex [Number] The index of the token hovered over.
     */
    onMouseOverToken?: (tokenIndex, e) => void;

    /**
     * Callback called when the user stop hovering over any tokens.
     */
    onMouseOutTokenizer?:() => void;
}
