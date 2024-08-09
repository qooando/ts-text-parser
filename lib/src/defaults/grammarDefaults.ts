import {SyntaxNode, SyntaxNodeFactoryFunction, SyntaxNodeFactoryParams} from "../types/syntax";

export namespace syntaxNodeFactory {

    export function identity(ctx: SyntaxNodeFactoryParams): SyntaxNode | SyntaxNode[] {
        return ctx.node;
    }

    export function ignore(ctx: SyntaxNodeFactoryParams): SyntaxNode | SyntaxNode[] {
        return []
    }

    export function nonCapturing(ctx: SyntaxNodeFactoryParams): SyntaxNode | SyntaxNode[] {
        return ctx.node.children
    }

    export let mergeUp = nonCapturing;

}