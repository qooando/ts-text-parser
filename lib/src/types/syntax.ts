
export interface Node {
    id: string
    type: string
    content?: string
    parent?: Node
    children?: Node[]
}