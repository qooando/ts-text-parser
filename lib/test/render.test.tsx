import {
    Grammar,
    Lexer,
    lexer,
    LexerContext,
    lexerOnMatch,
    Lexicon,
    parser, RendererDelegate, RenderSyntaxNodeCallback,
    syntaxNodeFactory,
    syntaxNodeToJson,
    renderingContext,
    renderingCallback, SyntaxNode, renderer
} from "../src";

import StringContext = renderingContext.StringContext;

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

let renderDelegate: RendererDelegate<StringContext> = {
    _default: renderingCallback.renderChildren,
    on_FOO: renderingCallback.appendContent,
    on_BAR: renderingCallback.appendContent
}

beforeEach(() => {
    global.console = require('console');
});

test('Render foo bar string', () => {
    let t = lexer(lexicon)
    let g = parser(grammar, {debug: false})
    let r = renderer(renderDelegate)
    let input = "foo foo bar foo bar foo foo"
    let ast = g.parse(t.tokenize(input))
    // let renderCtx = {
    //     output: ""
    // }
    // r.render(ast, renderCtx)
    let renderCtx = r.render(ast)
    console.log(renderCtx)
    expect(renderCtx.output).toBe("foofoobarfoobarfoofoo")
});