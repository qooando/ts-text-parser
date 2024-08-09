import {ParsingNode, Grammar, ParsingNodeType, SyntaxNodeFactoryFunction} from "./types/syntax";
import {Token} from "./types/lexicon";

const
    SUFFIX_BEGIN = "_$BEGIN",
    SUFFIX_END = "_$END";

function _linkChildren(from: ParsingNode | ParsingNode[], to: ParsingNode | ParsingNode[]) {
    from = Array.isArray(from) ? from : [from];
    to = Array.isArray(to) ? from : [to];
    from.forEach(f => {
        to.forEach(t => {
            f.children.add(t);
            t.parents.add(f);
        })
    });
}

export interface GrammarParserOptions {
    debug: boolean
}

export class GrammarParser {
    debug: boolean;

    _parsingNodes: Map<string, ParsingNode>; // star graph for all parsing grammar rules and their additional info
    _startParsingNode: ParsingNode;

    grammar: Grammar
    _rawRules: Map<string, { consequents: string, nodeFactory?: SyntaxNodeFactoryFunction }>;
    _rawStartRule: string;

    constructor(grammar: Grammar, options: GrammarParserOptions = null) {
        this.debug = options?.debug ?? false
        this.grammar = grammar;
        this._initializeParsingGraph();
    }

    toString(): string {
        return [...this._rawRules.entries()].map(e => {
            return `${e[0]} := ${e[1].consequents}`
        }).join("\n");
    }

    parse(tokens: Generator<Token>) {
        const self = this;
        const parsingNodes = this._parsingNodes;

        /*
            for every input term we must check all candidates (OR)
            and continue to the next symbols and term with the paths that match the term
         */

        type Step = {
            id: number,
            nesting: number,
            previous: Step,
            return?: Step
            grammarNode: ParsingNode,
            ruleGrammarNode?: ParsingNode
            matchingTerm?: Token
        }

        let nextIndex = 0;

        const rootStep: Step = {
            id: nextIndex++,
            nesting: 0,
            previous: null,
            grammarNode: this._startParsingNode,
            ruleGrammarNode: this._startParsingNode
        }

        let endStep: Step = null;
        let toVisitCurrent: Step[] = [rootStep],
            toVisitNext: Step[] = [];

        let termIterator: IteratorResult<Token> = null;

        while ((termIterator = tokens.next())) {
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
                    case ParsingNodeType.RULE_START:
                    case ParsingNodeType.GROUP_START:
                    case ParsingNodeType.GROUP_END:
                        toVisitCurrent.unshift(...[...currentGrammarNode.children.values()]
                            .map(n => {
                                return {
                                    id: nextIndex++,
                                    nesting: currentStep.nesting + (currentGrammarNode.nodeType === ParsingNodeType.GROUP_END ? -1 : +1),
                                    previous: currentStep,
                                    grammarNode: n,
                                    ruleGrammarNode: currentStep.ruleGrammarNode,
                                    return: currentStep.return
                                }
                            }));
                        break;
                    case ParsingNodeType.RULE_END:
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
                    case ParsingNodeType.RULE_REFERENCE:
                        const nextGrammarNode = parsingNodes.get(currentGrammarNode.mustExpandToRuleName);
                        toVisitCurrent.unshift({
                            id: nextIndex++,
                            nesting: currentStep.nesting + 1,
                            previous: currentStep,
                            grammarNode: nextGrammarNode,
                            ruleGrammarNode: nextGrammarNode,
                            return: currentStep
                        });
                        break;
                    case ParsingNodeType.TERMINAL:
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
            const content = [currentTerm, ...tokens].slice(0, 6).map(t => t.content).join(" ");
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
                case ParsingNodeType.RULE_END:
            }
            currentStep = currentStep.previous;
        }

        const outputGraph = {}
        // start from rootItem and populate the graph accordingly
        // FIXME populate
        return outputGraph;
    }

    protected _initializeParsingGraph() {
        const grammar = this.grammar;
        this._parsingNodes = new Map();
        this._rawStartRule = grammar[0][0];
        this._rawRules = new Map(grammar.map(x => [x[0], {consequents: x[1], nodeFactory: x[2]}]));

        type SaveContext = {
            groupStartNode: ParsingNode,
            visitedTokens: string[]
        }

        // populate star graph
        for (const [_originalRuleName, _consequents, _nodeFactory] of grammar) {
            if (this.debug) {
                console.debug(`${_originalRuleName} ::= ${_consequents}`)
            }
            const
                // create rule start node
                ruleStartNode: ParsingNode = {
                    id: `${_originalRuleName}${SUFFIX_BEGIN}`,
                    nodeType: ParsingNodeType.RULE_START,
                    parents: new Set<ParsingNode>(),
                    children: new Set<ParsingNode>(),
                    originRuleName: _originalRuleName,
                    syntaxNodeFactoryFun: _nodeFactory
                },
                // create rule end node
                ruleEndNode: ParsingNode = {
                    id: `${_originalRuleName}${SUFFIX_END}`,
                    nodeType: ParsingNodeType.RULE_END,
                    parents: new Set<ParsingNode>(),
                    children: new Set<ParsingNode>(),
                    originRuleName: _originalRuleName,
                    syntaxNodeFactoryFun: _nodeFactory
                };

            // update cross references
            ruleEndNode.groupStartNode = ruleStartNode;
            ruleStartNode.groupEndNode = ruleEndNode;

            // add nodes to graph
            this.addNode(ruleStartNode, ruleEndNode);

            // list tokens to visit for this rule
            let ruleTokensToVisit = [
                ..._consequents.split(/\s+|(?=[()*+?|])/).filter(x => !/^\s*$/.test(x)),
            ];
            // list of parents of the current node, populate it with nodes you
            // want to be the next node parents
            let previousNodes: ParsingNode[] = [ruleStartNode]

            // list of stacked context (shift/unshift, [0] is top)
            // with
            //  - the group start node
            let savedContexts: SaveContext[] = [{
                groupStartNode: ruleStartNode,
                visitedTokens: []
            }];
            let visitedContexts: SaveContext[] = [];

            // visit tokens until exhaustion.
            let tokenIndex = -1;
            while (ruleTokensToVisit.length) {
                tokenIndex += 1;
                const currentToken = ruleTokensToVisit.shift();
                if (!currentToken) {
                    return;
                }
                if (this.debug) {
                    console.debug(` [${tokenIndex}] ${currentToken}`)
                }
                const currentContext = savedContexts[0];

                switch (currentToken) {
                    case "(": {
                        // this is the start of a group
                        const
                            // create a new group start node
                            groupStartNode: ParsingNode = {
                                id: `${_originalRuleName}_(_${tokenIndex}${SUFFIX_BEGIN}`,
                                nodeType: ParsingNodeType.GROUP_START,
                                parents: new Set<ParsingNode>(),
                                children: new Set<ParsingNode>(),
                                originRuleName: _originalRuleName,
                            },
                            // create a new group end node
                            groupEndNode: ParsingNode = {
                                id: `${_originalRuleName}_)_${tokenIndex}${SUFFIX_END}`,
                                nodeType: ParsingNodeType.GROUP_END,
                                parents: new Set<ParsingNode>(),
                                children: new Set<ParsingNode>(),
                                originRuleName: _originalRuleName,
                            };
                        // set cross references
                        groupEndNode.groupStartNode = groupStartNode;
                        groupStartNode.groupEndNode = groupEndNode;

                        // add nodes to the graph
                        this.addNode(groupStartNode, groupEndNode);
                        // connect the start node
                        _linkChildren(previousNodes, groupStartNode);
                        // create a new context
                        savedContexts.unshift({
                            groupStartNode: groupStartNode,
                            visitedTokens: [currentToken]
                        });
                        previousNodes = [groupStartNode];
                        break;
                    }
                    case ")": {
                        // this is the end of the current group
                        // parentContext is the context we are going to close
                        let groupEndNode = currentContext.groupStartNode.groupEndNode;
                        // connect the groupEnd to the previous nodes
                        _linkChildren(previousNodes, groupEndNode);
                        previousNodes = [groupEndNode];
                        // remove the group context from saved contexts
                        currentContext.visitedTokens.push(currentToken);
                        visitedContexts.unshift(savedContexts.shift());
                        // thus the next context closing connects it to its fail node
                        savedContexts[0].visitedTokens.push(...currentContext.visitedTokens)
                        break;
                    }
                    case "|": {
                        // evaluate this symbol as the END of the sequence of symbols
                        // and start of another sequence
                        // all sequences are bounded to the same start and end groups
                        let groupStartNode = currentContext.groupStartNode,
                            groupEndNode = groupStartNode.groupEndNode;
                        _linkChildren(previousNodes, groupEndNode);
                        previousNodes = [groupStartNode]
                        currentContext.visitedTokens.push(currentToken);
                    }
                    case "?": {
                        if (previousNodes.length !== 1) {
                            throw new Error(`Syntax error: too much parents for optional`)
                        }
                        currentContext.visitedTokens.push(currentToken);
                        // this is the optional symbol
                        // previous nodes can be matched or not
                        const prevNode = previousNodes[0];
                        // for each parent we want to add its FAIL condition to parentsOnFailContinue
                        if (prevNode.nodeType === ParsingNodeType.GROUP_END) {
                            // for groups, just provides as new additional parent the parent of the start node
                            // thus skipping the group at all
                            previousNodes.push(...prevNode.groupStartNode.parents)
                        } else {
                            // for normal nodes, just add the parent
                            previousNodes.push(...prevNode.parents)
                        }
                        break;
                    }
                    case "*": {
                        // this is the zero or more repetition
                        if (previousNodes.length !== 1) {
                            throw new Error(`Syntax error: Too much parents for zero or more repetitions`)
                        }
                        currentContext.visitedTokens.push(currentToken);
                        const prevNode = previousNodes[0];
                        if (prevNode.nodeType === ParsingNodeType.GROUP_END) {
                            // for groups add groups start parent to the next parents (allow to skip all)
                            // then link the end node to start node (allow repetition)
                            _linkChildren(prevNode, prevNode.groupStartNode);
                            previousNodes.push(...prevNode.groupStartNode.parents)
                        } else {
                            // for the normal nodes just loop on itself
                            _linkChildren(prevNode, prevNode);
                            previousNodes.push(...prevNode.parents)
                        }
                        break;
                    }
                    case "+": {
                        if (previousNodes.length !== 1) {
                            throw new Error(`Syntax error: too much parents for one or more repetitions`)
                        }
                        const prevNode = previousNodes[0];
                        // ignore the "+", just copy the last group/symbol in the ruleTokensToVisit and continue
                        // thus A+ will be AA*
                        if (prevNode.nodeType === ParsingNodeType.GROUP_END) {
                            ruleTokensToVisit.unshift(...visitedContexts[0].visitedTokens, "*")
                        } else {
                            ruleTokensToVisit.unshift(currentContext.visitedTokens[currentContext.visitedTokens.length - 1], "*")
                        }
                        break;
                    }
                    default: { // and
                        currentContext.visitedTokens.push(currentToken);
                        const newNodeType: ParsingNodeType = this._rawRules.has(currentToken) ? ParsingNodeType.RULE_REFERENCE : ParsingNodeType.TERMINAL;

                        switch (newNodeType) {
                            case ParsingNodeType.RULE_REFERENCE: {
                                const newNode: ParsingNode = {
                                    id: `${_originalRuleName}_${currentToken}_${tokenIndex}`,
                                    nodeType: newNodeType,
                                    children: new Set<ParsingNode>(),
                                    parents: new Set<ParsingNode>(),
                                    originRuleName: _originalRuleName,
                                    mustExpandToRuleName: `${currentToken}${SUFFIX_BEGIN}`
                                };
                                // add node
                                this.addNode(newNode);
                                // link with previous
                                _linkChildren(previousNodes, newNode)
                                previousNodes = [newNode];
                                break;
                            }
                            case ParsingNodeType.TERMINAL: {
                                const newNode: ParsingNode = {
                                    id: `${_originalRuleName}_${currentToken}_${tokenIndex}`,
                                    nodeType: newNodeType,
                                    children: new Set<ParsingNode>(),
                                    parents: new Set<ParsingNode>(),
                                    originRuleName: _originalRuleName,
                                    mustMatchTerm: currentToken
                                };
                                // add node
                                this.addNode(newNode);
                                // link with previous
                                _linkChildren(previousNodes, newNode)
                                previousNodes = [newNode];
                                break;
                            }
                        }
                    }
                }
            } // end tokens

            _linkChildren(previousNodes, ruleEndNode);
        } // end rules

    } // end constructor

    protected addNode(...nodes: ParsingNode[]) {
        nodes.forEach(node => {
            if (!this._startParsingNode) {
                this._startParsingNode = node;
            }
            this._parsingNodes.set(node.id, node)
        });
    }

}

export function parser(rules: Grammar, options: GrammarParserOptions = null) {
    return new GrammarParser(rules, options);
}
