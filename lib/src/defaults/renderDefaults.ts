import {RendererContext} from "../types/rendering";
import {Renderer} from "../render";
import {SyntaxNode} from "../types/syntax";

export namespace context {
    export interface SimpleContext<Output> extends RendererContext {
        output: Output
    }

    export interface StringContext extends SimpleContext<String> {

    }
}

export namespace callback {

    import SimpleContext = context.SimpleContext;

    export function ignore<Context>(node: SyntaxNode, ctx: Context) {
        return ctx;
    }

    export function renderChildren<Context extends RendererContext>(node: SyntaxNode, ctx: Context) {
        return ctx.renderChildren(node, ctx);
    }

    export function delegateTo<Context extends SimpleContext<any>>(renderer: Renderer<Context>) {
        return function _delegateTo(node: SyntaxNode, ctx: Context) {
            let subctx = Object.assign({}, ctx);
            subctx.render = null;
            subctx.renderChildren = null;
            subctx = renderer.render(node, subctx); // context switch and back
            ctx.output = subctx.output;
            return ctx;
        }
    }

    export function delegateChildrenTo<Context extends SimpleContext<any>>(renderer: Renderer<Context>) {
        return function _delegateChildrenTo(node: SyntaxNode, ctx: Context) {
            let subctx = Object.assign({}, ctx);
            subctx.render = null;
            subctx.renderChildren = null;
            subctx = renderer.renderChildren(node, subctx); // context switch and back
            ctx.output = subctx.output;
            return ctx;
        }
    }

    export function appendContextVariableValue(node: SyntaxNode, ctx: SimpleContext<string>) {
        ctx.output += ctx.contextVariables[node.content];
        return ctx;
    }

    export function appendContent(node: SyntaxNode, ctx: SimpleContext<string>) {
        if (!ctx.output) {
            ctx.output = node.content
        } else {
            ctx.output += node.content;
        }
        return ctx;
    }

    export function appendConstant(value: string, indent: boolean = true) {
        return function _appendConstant(node: SyntaxNode, ctx: SimpleContext<string>) {
            ctx.output += (indent ? " ".repeat(ctx.depth) : "") + value + "\n";
            return ctx;
        }
    }

    export function appendPlaceholder(indent: boolean = true) {
        return function _appendPlaceholder(node: SyntaxNode, ctx: SimpleContext<string>) {
            ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "[[" + node.type + "]]\n";
            ctx.renderChildren(node, ctx);
            return ctx;
        }
    }

    export function appendName(indent: boolean = true) {
        return function _appendName(node: SyntaxNode, ctx: SimpleContext<string>) {
            ctx.output += (indent ? " ".repeat(ctx.depth) : "") + node.type + "\n";
            return ctx;
        }
    }

    export function appendNameStart(indent: boolean = true) {
        return function _appendNameStart(node: SyntaxNode, ctx: SimpleContext<string>) {
            ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "START " + node.type + "\n";
            return ctx;
        }
    }

    export function appendNameEnd(indent: boolean = true) {
        return function _appendNameEnd(node: SyntaxNode, ctx: SimpleContext<string>) {
            ctx.output += (indent ? " ".repeat(ctx.depth) : "") + "END " + node.type + "\n";
            return ctx;
        }
    }

}