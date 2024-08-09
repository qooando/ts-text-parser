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

    // export function mergeSameTypeSiblings(ctx: SyntaxNodeFactoryParams): SyntaxNode | SyntaxNode[] {
    //     if (ctx.node.parent &&
    //         ctx.node.parent.children[0] &&
    //         ctx.node.parent.children[0].type === ctx.node.type) {
    //         if (ctx.node.content) {
    //             ctx.node.parent.children[0].content += ctx.node.content
    //         }
    //         if (ctx.node.children) {
    //             ctx.node.parent.children[0].children.unshift(...ctx.node.children)
    //         }
    //         return []
    //     }
    //     return ctx.node;
    // }


}