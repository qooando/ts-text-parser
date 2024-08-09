import {ast} from "./ast";

export namespace render {
    //
    // export type RenderNodeFunction<Context> = (node: ast.AstItem, ctx: Context) => any;
    //
    // export interface RenderingRule<Context> {
    //     event: string
    //     visit?: RenderNodeFunction<Context>
    //     before?: RenderNodeFunction<Context>
    //     after?: RenderNodeFunction<Context>
    //     contextVariables: object
    // }
    //
    // export let isVisitor = (x: any) => x && "event" in x;
    // export let isArrayOfVisitors = (x: any) => x && isVisitor(x[0]);
    //
    // export interface RenderingDelegate<Context> {
    //     // _default?: VisitNodeFunction;
    //     // [key: string]: ((node: ast.Node, ctx: object) => any);
    //     // x(node: ast.Node, ctx: object): any
    //     [key: string]: RenderNodeFunction<Context>
    // }
    //
    // export type RenderingRuleAsTuple<Context> =
    //     [string, RenderNodeFunction<Context>]
    //     | [string, RenderNodeFunction<Context>, RenderNodeFunction<Context>]
    //     | [string, RenderNodeFunction<Context>, RenderNodeFunction<Context>, RenderNodeFunction<Context>];
    // export let isVisitorAsTuple = (x: any) => Array.isArray(x) && typeof x[1] === "function" && x.length >= 2 && x.length <= 4;
    // export let isArrayOfVisitorAsTuple = (x: any) => Array.isArray(x) && isVisitorAsTuple(x[0]);
    //
    // export type RenderingRules<Context> =
    //     RenderingRule<Context>[]
    //     | RenderingRuleAsTuple<Context>[]
    //     | RenderingDelegate<Context>;
    //
    // export type RenderFunction<Context> = (<SubContext extends Context>(ast: ast.AstItem, ctx: SubContext) => SubContext);
    //
    // export interface RenderingContext {
    //     depth?: number
    //     render?: RenderFunction<RenderingContext>
    //     renderChildren?: RenderFunction<RenderingContext>
    //     contextVariables?: any
    // }
    //
    // export interface RendererOptions {
    //     debug?: boolean
    // }
    //
    // export class Renderer<Context extends RenderingContext> {
    //     debug: boolean
    //     renderingRules: Map<string, RenderingRule<Context>>
    //     renderingDelegate: RenderingDelegate<Context>
    //
    //     constructor(rules: RenderingRules<Context>, options: RendererOptions = undefined) {
    //         this.debug = options?.debug ?? false;
    //         if (isArrayOfVisitorAsTuple(rules)) {
    //             this.renderingRules = new Map<string, RenderingRule<Context>>((rules as RenderingRuleAsTuple<Context>[])
    //                 .map((x: RenderingRuleAsTuple<Context>) => {
    //                     switch (x.length) {
    //                         case 2:
    //                             return [x[0], {event: x[0], visit: x[1]} as RenderingRule<Context>];
    //                         case 3:
    //                             return [x[0], {event: x[0], before: x[1], after: x[2]} as RenderingRule<Context>];
    //                         case 4:
    //                             return [x[0], {
    //                                 event: x[0],
    //                                 visit: x[1],
    //                                 before: x[2],
    //                                 after: x[3]
    //                             } as RenderingRule<Context>];
    //                     }
    //                 })
    //                 .map((e: [string, RenderingRule<Context>]) => {
    //                     e[1].visit ??= this.renderChildren.bind(this)
    //                     return e;
    //                 })
    //             );
    //             this.renderingDelegate = null;
    //         } else if (isArrayOfVisitors(rules)) {
    //             this.renderingRules = new Map<string, RenderingRule<Context>>((rules as RenderingRule<Context>[])
    //                 .map(x => [x.event, x])
    //                 .map((e: [string, RenderingRule<Context>]) => {
    //                     e[1].visit ??= this.renderChildren.bind(this)
    //                     return e;
    //                 })
    //             );
    //             this.renderingDelegate = null;
    //         } else {
    //             this.renderingRules = null;
    //             this.renderingDelegate = rules as RenderingDelegate<Context>;
    //         }
    //     }
    //
    //     renderChildren(ast: ast.AstItem, ctx: Context = null): Context {
    //         ctx.depth++;
    //         ast.children.forEach(c => this.render(c, ctx));
    //         ctx.depth--;
    //         return ctx;
    //     }
    //
    //     render(ast: ast.AstItem, ctx: Context = null): Context {
    //         ctx ??= {depth: 0} as Context;
    //         ctx.depth ??= 0;
    //         ctx.contextVariables ??= {};
    //         ctx.render ??= this.render.bind(this);
    //         ctx.renderChildren ??= this.renderChildren.bind(this);
    //
    //         if (ast === null) {
    //             throw new Error(`No ast provided`);
    //         }
    //         if (this.renderingRules) {
    //             let rule = this.renderingRules.get(ast.name) ?? this.renderingRules.get("*");
    //             if (rule && rule.before) {
    //                 rule.before(ast, ctx);
    //             }
    //             if (rule && rule.visit) {
    //                 rule.visit(ast, ctx);
    //             } else {
    //                 ctx.renderChildren(ast, ctx);
    //             }
    //             if (rule && rule.after) {
    //                 rule.after(ast, ctx);
    //             }
    //         } else {
    //             let ruleName: string = `on_${ast.name}_before`;
    //             let rule: RenderNodeFunction<Context> = this.renderingDelegate[ruleName];
    //             if (rule) {
    //                 if (this.debug) {
    //                     console.log(`${" ".repeat(ctx.depth)}${ast.name} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
    //                 }
    //                 rule(ast, ctx);
    //             }
    //             ruleName = `on_${ast.name}`;
    //             rule = this.renderingDelegate[ruleName];
    //             if (!rule) {
    //                 if (this.debug) {
    //                     console.log(`${" ".repeat(ctx.depth)}${ast.name} → ${ruleName} not found`);
    //                 }
    //                 ruleName = `_default`;
    //                 rule = this.renderingDelegate[ruleName];
    //             }
    //             if (!rule) {
    //                 if (this.debug) {
    //                     console.log(`${" ".repeat(ctx.depth)}${ast.name} → ${ruleName} not found`);
    //                 }
    //                 ruleName = `*fallback*`
    //                 rule = ctx.renderChildren
    //             }
    //             if (this.debug) {
    //                 console.log(`${" ".repeat(ctx.depth)}${ast.name} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
    //             }
    //             rule(ast, ctx);
    //             ruleName = `on_${ast.name}_after`;
    //             rule = this.renderingDelegate[ruleName];
    //             if (rule) {
    //                 if (this.debug) {
    //                     console.log(`${" ".repeat(ctx.depth)}${ast.name} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
    //                 }
    //                 rule(ast, ctx);
    //             }
    //         }
    //         return ctx;
    //     }
    // }
    //
    // export function renderer<Result>(rules: RenderingRules<Result>, options: RendererOptions = undefined) {
    //     return new Renderer(rules, options);
    // }
    //
    // export namespace context {
    //     export interface SimpleContext<Output> extends RenderingContext {
    //         output: Output
    //     }
    // }
    //
    // export namespace visitor {
    //
    //     import SimpleContext = render.context.SimpleContext;
    //
    //     export function ignore<Context>(node: ast.AstItem, ctx: Context) {
    //         return ctx;
    //     }
    //
    //     export function renderChildren<Context extends RenderingContext>(node: ast.AstItem, ctx: Context) {
    //         return ctx.renderChildren(node, ctx);
    //     }
    //
    //     export function delegateTo<Context extends SimpleContext<any>>(renderer: Renderer<Context>) {
    //         return function _delegateTo(node: ast.AstItem, ctx: Context) {
    //             let subctx = Object.assign({}, ctx);
    //             subctx.render = null;
    //             subctx.renderChildren = null;
    //             subctx = renderer.render(node, subctx); // context switch and back
    //             ctx.output = subctx.output;
    //             return ctx;
    //         }
    //     }
    //
    //     export function delegateChildrenTo<Context extends SimpleContext<any>>(renderer: Renderer<Context>) {
    //         return function _delegateChildrenTo(node: ast.AstItem, ctx: Context) {
    //             let subctx = Object.assign({}, ctx);
    //             subctx.render = null;
    //             subctx.renderChildren = null;
    //             subctx = renderer.renderChildren(node, subctx); // context switch and back
    //             ctx.output = subctx.output;
    //             return ctx;
    //         }
    //     }
    //
    //     export function appendContextVariableValue(node: ast.AstItem, ctx: SimpleContext<string>) {
    //         ctx.output += ctx.contextVariables[node.content];
    //         return ctx;
    //     }
    //
    //     export function appendContent(node: ast.AstItem, ctx: SimpleContext<string>) {
    //         ctx.output += node.content;
    //         return ctx;
    //     }
    //
    //     export function appendConstant(value: string, indent: boolean = true) {
    //         return function _appendConstant(node: ast.AstItem, ctx: SimpleContext<string>) {
    //             ctx.output += (indent ? " ".repeat(ctx.depth) : "") + value + "\n";
    //             return ctx;
    //         }
    //     }
    //
    //     export function appendPlaceholder(indent: boolean = true) {
    //         return function _appendPlaceholder(node: ast.AstItem, ctx: SimpleContext<string>) {
    //             ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "[[" + node.name + "]]\n";
    //             ctx.renderChildren(node, ctx);
    //             return ctx;
    //         }
    //     }
    //
    //     export function appendName(indent: boolean = true) {
    //         return function _appendName(node: ast.AstItem, ctx: SimpleContext<string>) {
    //             ctx.output += (indent ? " ".repeat(ctx.depth) : "") + node.name + "\n";
    //             return ctx;
    //         }
    //     }
    //
    //     export function appendNameStart(indent: boolean = true) {
    //         return function _appendNameStart(node: ast.AstItem, ctx: SimpleContext<string>) {
    //             ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "START " + node.name + "\n";
    //             return ctx;
    //         }
    //     }
    //
    //     export function appendNameEnd(indent: boolean = true) {
    //         return function _appendNameEnd(node: ast.AstItem, ctx: SimpleContext<string>) {
    //             ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "END " + node.name + "\n";
    //             return ctx;
    //         }
    //     }
    //
    // }

}