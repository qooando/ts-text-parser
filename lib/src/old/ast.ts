import {lexicon} from "./lexicon";
import {grammar} from "./grammar";
import GrammarNodeType = grammar.NodeType;

export namespace ast {

    /*
     Ast node
     */
    export interface Node {
        id: string
        type: string
        content?: string
        parent?: Node
        children?: Node[]
    }

    export interface NodeFactoryParams {
        node: Node
    }

    export type NodeFactoryFunction = (params: NodeFactoryParams) => Node | Node[];

    export namespace parsing {

        export interface ParserOptions {
            debug?: boolean
            debugAll?: boolean
        }

        /*
            a parser leverages a grammar and tokenizer to transform an input to an ast
         */
        export class Parser {
            log = console
            tokenizer: lexicon.Lexer;
            grammar: grammar.GrammarParser;
            debug = false;
            debugAll = false;

            constructor(_tokenizer: lexicon.Lexer | lexicon.Lexicon,
                        _grammar: grammar.GrammarParser | grammar.Grammar,
                        options: ParserOptions = undefined) {
                this.debug = options?.debug ?? false;
                this.debugAll = this.debug && (options?.debugAll ?? false);
                if (Array.isArray(_tokenizer)) {
                    _tokenizer = lexicon.lexer(_tokenizer);
                }
                if (Array.isArray(_grammar)) {
                    _grammar = grammar.parser(_grammar, {debug: this.debug});
                }
                this.tokenizer = _tokenizer as lexicon.Lexer;
                this.grammar = _grammar as grammar.GrammarParser;
            }

            parse(raw: string) {
                const self = this;

                // const termsToParse: iterators.BufferedIterator<lexicon.Term> = iterators.buffered(this.tokenizer.tokenize(raw));
                const termsToParse = this.tokenizer.tokenize((raw));
                const startRule = this.grammar.startNode;
                const rules = this.grammar.nodes;

                /*
                    for every input term we must check all candidates (OR)
                    and continue to the next symbols and term with the paths that match the term
                 */

                type Step = {
                    id: number,
                    nesting: number,
                    previous: Step,
                    return?: Step
                    grammarNode: grammar.Node,
                    ruleGrammarNode?: grammar.Node
                    matchingTerm?: lexicon.Term
                }

                let nextIndex = 0;
                
                const rootStep: Step = {
                    id: nextIndex++,
                    nesting: 0,
                    previous: null,
                    grammarNode: this.grammar.startNode,
                    ruleGrammarNode: this.grammar.startNode
                }

                let endStep: Step = null;
                let toVisitCurrent: Step[] = [rootStep],
                    toVisitNext: Step[] = [];

                let termIterator: IteratorResult<lexicon.Term> = null;

                while ((termIterator = termsToParse.next())) {
                    // termIterator can be done, in that case we need to reach the END of all symbols to visit
                    // without further match
                    const currentTerm = termIterator.value;
                    if (this.debug) {
                        console.debug(`Parse ${currentTerm?.term}`);
                    }
                    const visitedCurrent: Set<any> = new Set();
                    while (toVisitCurrent.length) {
                        const currentStep = toVisitCurrent.shift();
                        // avoid to visit the same node for this token
                        // NOTE, it was already visited somewhere, its result already matched
                        // if (visitedCurrent.has(currentWalkNode.ruleGrammarNode.id)) {
                        //     continue;
                        // }
                        // visitedCurrent.add(currentWalkNode.ruleGrammarNode.id);

                        const currentGrammarNode = currentStep.grammarNode;
                        if (this.debug) {
                            console.debug(` ${" ".repeat(currentStep.nesting)}(${currentStep.id}) ${currentGrammarNode.id}`);
                        }
                        switch (currentGrammarNode.nodeType) {
                            case grammar.NodeType.RULE_START:
                            case grammar.NodeType.GROUP_START:
                            case grammar.NodeType.GROUP_END:
                                toVisitCurrent.unshift(...[...currentGrammarNode.children.values()]
                                    .map(n => {
                                        return {
                                            id: nextIndex++,
                                            nesting: currentStep.nesting + (currentGrammarNode.nodeType === GrammarNodeType.GROUP_END ? -1 : +1),
                                            previous: currentStep,
                                            grammarNode: n,
                                            ruleGrammarNode: currentStep.ruleGrammarNode,
                                            return: currentStep.return
                                        }
                                    }));
                                break;
                            case grammar.NodeType.RULE_END:
                                currentStep.nesting -= 1;
                                const returnWalkNode = currentStep.return
                                if (returnWalkNode) {
                                    toVisitCurrent.unshift(...[...returnWalkNode.grammarNode.children]
                                        .map(n => {
                                            return {
                                                id: nextIndex++,
                                                nesting: returnWalkNode.nesting,
                                                previous: currentStep,
                                                grammarNode: n,
                                                ruleGrammarNode: returnWalkNode.ruleGrammarNode,
                                                return: returnWalkNode.return
                                            }
                                        }));
                                } else {
                                    // continue just to be sure there is a better match
                                    endStep = currentStep;
                                }
                                break;
                            case grammar.NodeType.RULE_REFERENCE:
                                const nextGrammarNode = this.grammar.nodes.get(currentGrammarNode.mustExpandToRuleName);
                                toVisitCurrent.unshift({
                                    id: nextIndex++,
                                    nesting: currentStep.nesting + 1,
                                    previous: currentStep,
                                    grammarNode: nextGrammarNode,
                                    ruleGrammarNode: nextGrammarNode,
                                    return: currentStep
                                });
                                break;
                            case grammar.NodeType.TERMINAL:
                                if (currentGrammarNode.mustMatchTerm === currentTerm?.term) {
                                    currentStep.matchingTerm = currentTerm;
                                    if (this.debug) {
                                        console.debug(`> Match ${currentTerm?.term}`)
                                    }
                                    toVisitNext.unshift(...[...currentGrammarNode.children.values()]
                                        .map(n => {
                                            return {
                                                id: nextIndex++,
                                                nesting: currentStep.nesting,
                                                previous: currentStep,
                                                grammarNode: n,
                                                ruleGrammarNode: currentStep.ruleGrammarNode,
                                                return: currentStep.return
                                            }
                                        }));
                                }
                                break;
                            default:
                                throw new Error(`Parsing error: grammar node type not implemented: ${currentGrammarNode.nodeType}`);
                        }

                    } // end single toVisit element visit

                    toVisitCurrent = toVisitNext;
                    toVisitNext = [];

                    if (termIterator.done || toVisitCurrent.length === 0) {
                        break;
                    }
                } // end term visit

                if (!endStep || endStep.ruleGrammarNode !== rootStep.ruleGrammarNode) {
                    console.error(`Parsing error: input doesn't match the grammar`)
                }

                if (!termIterator.done) {
                    const currentTerm = termIterator.value;
                    const content = [currentTerm, ...termsToParse].slice(0, 6).map(t => t.content).join(" ");
                    console.error(`Parser error: parser stops, no match for term '${currentTerm.term}': '${currentTerm.content}' at \n${content}`);
                }

                // // FIXME starting from the endWalkNode follow the parent and rebuild the full hierarchy
                // if (this.debug) {
                //
                //     var walkpath = [..._backvisit(endStep)];
                //     walkpath.reverse()
                //     console.log(
                //         walkpath.map(x => " ".repeat(x.nesting)
                //             + x.grammarNode.id
                //             + " "
                //             + "(" + x.ruleGrammarNode.id + ")"
                //         ).join('\n'));
                // }

                let parentNodes: Node[] = [];
                let currentStep = endStep;
                while (currentStep) {
                    const currentParent = parentNodes[0];
                    const grammarNode = currentStep.grammarNode
                    const ruleGrammarNode = currentStep.ruleGrammarNode
                    switch (grammarNode.nodeType) {
                        case grammar.NodeType.RULE_END:
                    }
                    currentStep = currentStep.previous;
                }

                const outputGraph = {}
                // start from rootItem and populate the graph accordingly

                // FIXME populate
                return outputGraph;
            }
        }

    }

    export function parser(_tokenizer: lexicon.Lexer | lexicon.Lexicon,
                           _grammar: grammar.GrammarParser | grammar.Grammar,
                           options: parsing.ParserOptions = undefined
    ) {
        return new parsing.Parser(_tokenizer, _grammar, options);
    }

    //
    // export namespace nodeFactory {
    //
    //     export function identity(ctx: AstVertexFactoryContext): grammar.Node | grammar.Node[] {
    //         return null;
    //         // return ctx.data;
    //     }
    //
    //     export function mergeUp(ctx: AstVertexFactoryContext): grammar.Node | grammar.Node[] {
    //         return null;
    //         // return ctx.data.children;
    //     }
    //
    //     export function ignore(ctx: AstVertexFactoryContext): grammar.Node | grammar.Node[] {
    //         return null;
    //     }
    //
    // }

}