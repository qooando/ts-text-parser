import {RendererDelegate, RendererContext, RenderSyntaxNodeCallback} from "./types/rendering";
import {SyntaxNode} from "./types/syntax";

export interface RendererOptions {
    debug?: boolean
    outputField?: string
}

export class Renderer<Context extends RendererContext> {
    debug: boolean
    outputField: string
    _delegate: RendererDelegate<Context>

    constructor(delegate: RendererDelegate<Context>, options: RendererOptions = undefined) {
        this.debug = options?.debug ?? false;
        this.outputField = options?.outputField ?? "output"
        this._delegate = delegate;
    }

    renderChildren(ast: SyntaxNode, ctx: Context = null): Context {
        ctx.depth++;
        ast.children.forEach(c => this.render(c, ctx));
        ctx.depth--;
        return ctx;
    }

    render(ast: SyntaxNode, ctx: Context = null): [any, Context] {
        ctx ??= {depth: 0} as Context;
        ctx.depth ??= 0;
        ctx.contextVariables ??= {};
        ctx.render ??= this.render.bind(this);
        ctx.renderChildren ??= this.renderChildren.bind(this);

        if (ast === null) {
            throw new Error(`No ast provided`);
        }
        let ruleName: string = `on_${ast.type}_before`;
        let rule: RenderSyntaxNodeCallback<Context> = this._delegate[ruleName];
        if (rule) {
            if (this.debug) {
                console.log(`${" ".repeat(ctx.depth)}${ast.type} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
            }
            rule(ast, ctx);
        }
        ruleName = `on_${ast.type}`;
        rule = this._delegate[ruleName];
        if (!rule) {
            if (this.debug) {
                console.log(`${" ".repeat(ctx.depth)}${ast.type} → ${ruleName} not found`);
            }
            ruleName = `_default`;
            rule = this._delegate[ruleName];
        }
        if (!rule) {
            if (this.debug) {
                console.log(`${" ".repeat(ctx.depth)}${ast.type} → ${ruleName} not found`);
            }
            ruleName = `*fallback*`
            rule = ctx.renderChildren
        }
        if (this.debug) {
            console.log(`${" ".repeat(ctx.depth)}${ast.type} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
        }
        rule(ast, ctx);
        ruleName = `on_${ast.type}_after`;
        rule = this._delegate[ruleName];
        if (rule) {
            if (this.debug) {
                console.log(`${" ".repeat(ctx.depth)}${ast.type} → ${ruleName} → ${rule.name || rule.constructor.name || rule}`);
            }
            rule(ast, ctx);
        }
        return [(ctx as any)[this.outputField], ctx];
    }

}

export function renderer<Result>(delegate: RendererDelegate<Result>, options: RendererOptions = undefined) {
    return new Renderer(delegate, options);
}
