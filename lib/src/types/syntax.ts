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

export enum ParsingNodeType {
    TERMINAL,
    RULE_START,
    RULE_END,
    RULE_FAIL,
    RULE_REFERENCE,
    GROUP_START,
    GROUP_END,
    GROUP_FAIL
}

export interface ParsingNode {
    id: string;
    nodeType: ParsingNodeType
    parents: Set<ParsingNode>
    children: Set<ParsingNode>

    originRuleName?: string,
    mustMatchTerm?: string,
    mustExpandToRuleName?: string,
    groupStartNode?: ParsingNode,
    groupEndNode?: ParsingNode
    syntaxNodeFactoryFun?: SyntaxNodeFactoryFunction
}

export type GrammarRule = [
    name: string,
    consequents: string,
    factory?: SyntaxNodeFactoryFunction
];

export type Grammar = GrammarRule[];
