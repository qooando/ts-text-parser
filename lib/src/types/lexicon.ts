/**
 * Output lexicon term token
 */
export interface Token {
    term: string
    content: string

    [x: string]: any
}


/**
 * Simple lexicon term definition.
 *
 * It should define a term name (the same of the output), a regex to match the content
 * optionally an enable predicate and consumer that produce a new output Term
 */
export type Term = [
    term: string,
    regex: RegExp,
    onMatch?: LexerContextConsumer,
    enable?: LexerContextPredicate
]

/**
 * A lexicon is a list of terms
 */
export type Lexicon = Term[]

/**
 * Lexer/Tokenizer context
 */
export interface LexerContext {
    tokensOutputBuffer?: Token[]
    tokensOutputBufferMaxLength?: number
    term?: Term
    matches?: any[]

    [x: string]: any
}

export type LexerContextConsumer = (ctx: LexerContext) => void;
export type LexerContextPredicate = (ctx: LexerContext) => boolean;
