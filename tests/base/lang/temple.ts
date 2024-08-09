// import {render} from "../render.js"
// import {ast} from "../ast.js";
// import {grammar} from "../grammar.js"
// import {lexicon} from "../lexicon.js";
//
// let enableIfIsCode = (ctx: lexicon.LexerContext) => ctx.captureCode
// let enableIfIsNotCode = (ctx: lexicon.LexerContext) => !ctx.captureCode
//
// export let lexicalRules: lexicon.Lexicon = [
//     ["CODE_START", /\{\{/y, (ctx: lexicon.LexerContext) => {
//         ctx.captureCode = true;
//         ctx.termsBuffer.push({
//             term: ctx.rule.term,
//             content: ctx.matches[0]
//         });
//     }],
//     ["CODE_END", /}}/y, (ctx: lexicon.LexerContext) => {
//         ctx.captureCode = false;
//         ctx.termsBuffer.push({
//             term: ctx.rule.term,
//             content: ctx.matches[0]
//         });
//     }],
//     ["GROUP_OPEN", /\(/, null, enableIfIsCode],
//     ["GROUP_CLOSE", /\)/, null, enableIfIsCode],
//     ["IF", /if/, null, enableIfIsCode],
//     ["ELSE", /else/, null, enableIfIsCode],
//     ["END", /end/, null, enableIfIsCode],
//     ["FOREACH", /foreach/, null, enableIfIsCode],
//     ["FROM", /from/, null, enableIfIsCode],
//     ["EQ_ASSIGN", /:=/, null, enableIfIsCode],
//     ["EQ_COALESCE", /\?\?=/, null, enableIfIsCode],
//     // ["FOR", /for/, null, enableIfIsCode],
//     // ["WITH", /with/, null, enableIfIsCode],
//     ["REFERENCE", /\$/, null, enableIfIsCode],
//     ["STRING", /"(([^"]|\\")*)"|'(([^"]|\\')*)'/, (ctx: lexicon.LexerContext) => {
//         ctx.termsBuffer.push({
//             term: ctx.rule.term,
//             content: ctx.matches[1]
//         });
//     }, enableIfIsCode],
//     ["NULL", /Null|None/, null, enableIfIsCode],
//     ["TRUE", /True/, null, enableIfIsCode],
//     ["FALSE", /False/, null, enableIfIsCode],
//     ["NUMBER", /[0-9.]+/, null, enableIfIsCode],
//     ["SEPARATOR", /(?!\\);/, null, enableIfIsCode],
//     ["PIPE", /\|/, null, enableIfIsCode],
//     ["SPACE", /\s+/, lexicon.onMatch.ignore, enableIfIsCode],
//     ["IDENTIFIER", /[_a-zA-Z0-9]\S*/, null, enableIfIsCode],
//     ["CONTENT", /(.(?!\{\{|}}))*./sy, lexicon.onMatch.concatSameTerm, enableIfIsNotCode]
// ];
//
// export let grammarRules: grammar.Grammar = [
//     ["document", "branch"],
//     ["branch", "( statement separator )* statement?"],
//     ["statement", "if | foreach | echo | expression"],
//     ["separator", "SEPARATOR | CODE_END | CODE_START", ast.nodeFactory.ignore],
//
//     ["if", "IF GROUP_OPEN boolean_expression GROUP_CLOSE separator branch else? END"],
//     ["else", "ELSE separator branch"],
//
//     ["foreach", "FOREACH GROUP_OPEN assign_from GROUP_CLOSE separator branch END"],
//
//     ["echo", "variable | constant"],
//
//     ["boolean_expression", "expression"],
//     ["expression", "assign | value | GROUP_OPEN expression GROUP_CLOSE"],
//     ["assign", "left_operand assign_operator expression"],
//     ["left_operand", "variable"],
//     ["assign_operator", "EQ_ASSIGN | EQ_COALESCE"],
//     ["value", "variable | constant"],
//     ["assign_from", "left_operand FROM expression"],
//
//     ["variable", "REFERENCE IDENTIFIER", (ctx): ast.Node | ast.Node[] => {
//         return {id: ctx.data.name, data: {content: ctx.data.children[1].content}, in: new Map(), out: new Map()}
//     }],
//     ["constant", "CONTENT | STRING | NUMBER | boolean | NULL"],
//     ["boolean", "TRUE | FALSE"],
//     // ["test", "A+ ( B C )+"],
// ];
// // FIXME current implementation is not properly optimized but it is enough simple
// // TODO precompile grammar with optimization, e.g. if a rule does not contain X avoid to visit it at all
// //   avoid o visit not useful branches
// // TODO maybe transform the grammar in a decision tree to make parsing and ast generation faster ?
// //   the tree leaves/nodes are the grammar rules, edges are token terms. A node can be assigned to a rule or be a
// //   a middle node with more of a rule we need to discern. IF more rules match, assign the first.
// //   how to covert *?= in a decision tree? (a decision graph, better?) --> we need to create the parsing graph
// //   with the correct amount of nodes and edges. (primitives to add a new rule in the correct position, a rule can be more than one node)
// // TODO look behind and look forward symbols to avoid capturing code end and code start in this symbol?
//
// export function parser(options: ast.ParserOptions = undefined) {
//     return ast.parser(lexicalRules, grammarRules, options);
// }
//
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
