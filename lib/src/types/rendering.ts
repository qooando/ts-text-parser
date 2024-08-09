import {SyntaxNode} from "./syntax";

export type RenderSyntaxNodeCallback<Context> = (node: SyntaxNode, ctx: Context) => Context;

export interface RendererDelegate<Context> {
    [key: string]: RenderSyntaxNodeCallback<Context>
}

export type RenderFunction<Context> = (<SubContext extends Context>(ast: SyntaxNode, ctx: SubContext) => SubContext);

export interface RendererContext {
    depth?: number
    render?: RenderFunction<RendererContext>
    renderChildren?: RenderFunction<RendererContext>
    contextVariables?: any
}
