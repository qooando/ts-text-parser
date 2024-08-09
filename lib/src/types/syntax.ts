/**
 * Output AST syntax node
 */
export interface SyntaxNode {
    id: string
    type: string
    content?: string
    parent?: SyntaxNode
    children?: SyntaxNode[]
}

export interface SyntaxNodeFactoryParams {
    node: SyntaxNode
}

export type SyntaxNodeFactoryFunction = (params: SyntaxNodeFactoryParams) => SyntaxNode | SyntaxNode[];

export type GrammarRule = [
    name: string,
    consequents: string,
    factory?: SyntaxNodeFactoryFunction
];

export type Grammar = GrammarRule[];
