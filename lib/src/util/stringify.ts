import {SyntaxNode} from "../types/syntax";

export function syntaxNodeToJson(node: SyntaxNode, space=null) {
    return JSON.stringify(node, ["type", "children", "content"], 2);
}