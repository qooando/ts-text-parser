import {Grammar, Lexer, lexer, LexerContext, lexerOnMatch, Lexicon, parser, syntaxNodeToJson} from "../src";

let lexicon: Lexicon = [
    ["FOO", /foo/],
    ["BAR", /bar/],
    ["OPEN", /\(/],
    ["CLOSE", /\)/],
    ["SPACE", /\s+/, lexerOnMatch.ignore]
]

let grammar: Grammar = [
    ["statement", "( foo | bar )+"],
    ["foo", "FOO+"],
    ["bar", "BAR+"]
]

beforeEach(() => {
    global.console = require('console');
});

test('Parse foo bar string', () => {
    let tokenizer = lexer(lexicon)
    let grammer = parser(grammar, {debug: false})
    let input = "foo foo bar foo bar foo foo"
    // @ts-ignore
    let result = grammer.parse(tokenizer.tokenize(input))
    console.log(syntaxNodeToJson(result, 2))
});