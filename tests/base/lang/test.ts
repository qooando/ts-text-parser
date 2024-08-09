import {render} from "../../../lib/src/render"
import {ast} from "../../../lib/src/ast";
import {grammar} from "../../../lib/src/grammar"
import {lexicon} from "../../../lib/src/lexicon";

let enableIfIsCode = (ctx: lexicon.LexerContext) => ctx.captureCode
let enableIfIsNotCode = (ctx: lexicon.LexerContext) => !ctx.captureCode

export let lexicalRules: lexicon.Lexicon = [
    ["A", /A/y, null],
    ["B", /B/y, null],
    ["C", /C/y, null],
    ["D", /D/y, null],
];

export let grammarRules: grammar.Grammar = [
    ["a", "A+ b d c A*"],
    ["b", "B+"],
    ["c", "C+"],
    ["d", "D+"],
];

export function parser(options: ast.parsing.ParserOptions = null) {
    return ast.parser(lexicalRules, grammarRules, options);
}

// export interface ExpressionContext extends render.context.SimpleContext<any> {
//     expr_stack: []
//     expr_result: any
// }
//
// export function renderer(options: render.RendererOptions = undefined) {
//     const _expressionEvaluator: render.Renderer<ExpressionContext> = render.renderer({
//         _default: render.visitor.renderChildren,
//         on_expression: render.visitor.renderChildren,
//         on_variable: render.visitor.ignore,
//         on_variable_after(node, ctx) {
//             ctx.expr_result = ctx.contextVariables[node.content];
//         },
//         on_boolean_expression: render.visitor.renderChildren,
//         on_boolean_expression_after(node, ctx) {
//             ctx.expr_result = !!ctx.expr_result;
//         },
//         on_of_expression: render.visitor.renderChildren,
//         on_of_expression_after(node, ctx) {
//             // ctx.expr_result = !!ctx.expr_result;
//         },
//         // FIXME si fa il parsing della espressione e si risolve di conseguenza
//         // serve un stack per il calcolo annidato e si risolve il risultato sulla _after
//     }, options);
//
//     const _echoRenderer = render.renderer<render.context.SimpleContext<string>>({
//         _default: render.visitor.appendPlaceholder(),
//         on_variable: render.visitor.appendContextVariableValue,
//         on_constant: render.visitor.renderChildren,
//         on_boolean: render.visitor.renderChildren,
//         on_TRUE: render.visitor.appendContent,
//         on_FALSE: render.visitor.appendContent,
//         on_STRING: render.visitor.appendContent,
//         on_NUMBER: render.visitor.appendContent,
//         on_CONTENT: render.visitor.appendContent,
//     }, options);
//
//     return render.renderer<render.context.SimpleContext<string>>({
//         _default: render.visitor.appendPlaceholder(),
//         on_document: render.visitor.renderChildren,
//         on_branch: render.visitor.renderChildren,
//         on_statement: render.visitor.renderChildren,
//         on_echo: render.visitor.delegateChildrenTo(_echoRenderer),
//
//         on_if(node, ctx) {
//             let boolean_expression = node.children.filter(x => x.name === "boolean_expression")[0];
//             let exprResult = _expressionEvaluator.render(boolean_expression, {
//                 expr_result: undefined,
//                 expr_stack: [],
//                 output: undefined,
//                 contextVariables: ctx.contextVariables
//             });
//             if (!!exprResult.expr_result) {
//                 let true_branch = node.children.filter(x => x.name === "branch")[0];
//                 let subctx = ctx.render(true_branch, ctx);
//                 ctx.output = subctx.output;
//             } else {
//                 let true_branch = node.children.filter(x => x.name === "else")[0];
//                 let subctx = ctx.render(true_branch, ctx);
//                 ctx.output = subctx.output;
//             }
//             return ctx;
//         },
//         on_else: render.visitor.renderChildren,
//
//         on_foreach(node, ctx) {
//             let assign_of = node.children.filter(x => x.name === "expr_assign_of")[0];
//
//         },
//
//
//         on_expression: render.visitor.delegateTo(_expressionEvaluator),
//     }, options);
// }
