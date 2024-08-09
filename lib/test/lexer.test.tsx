import {Lexer, lexer, LexerContext, lexerOnMatch, Lexicon} from "../src";

let lexicon: Lexicon = [
    ["foo", /foo/],
    ["bar", /bar/, (ctx) => {
        ctx.tokensOutputBuffer.push({term: ctx.term[0], content: ctx.matches[0]})
    }],
    ["baz", /baz/, (ctx) => {
        ctx.tokensOutputBuffer.push({term: ctx.term[0], content: ctx.matches[0]})
    }, (ctx) => {
        return false;
    }],
    ["space", /\s+/, lexerOnMatch.ignore]
]

test('Initialize lexicon in a lexer', () => {
    let tokenizer = lexer(lexicon)
    expect(tokenizer).toBeInstanceOf(Lexer);
    expect(tokenizer.lexicon).toBe(lexicon);
});

test('Tokenize foo bar string', () => {
    let tokenizer = lexer(lexicon)
    let input = "foo foo bar foo bar foo foo"
    // @ts-ignore
    let tokens = [...tokenizer.tokenize(input)];
    expect(tokens.length).toBe(7)
    console.log(tokens)
});