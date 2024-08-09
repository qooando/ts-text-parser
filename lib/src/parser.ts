import {Grammar, SyntaxNode, SyntaxNodeFactoryFunction} from "./types/syntax";
import {Token} from "./types/lexicon";

const
    SUFFIX_BEGIN = "_$BEGIN",
    SUFFIX_END = "_$END";

export enum ParsingNodeType {
    TERMINAL,
    RULE_START,
    RULE_END,
    RULE_REFERENCE,
    GROUP_START,
    GROUP_END
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

    // start from rootItem and populate the graph accordingly

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

    parse(tokens: Generator<Token>): SyntaxNode {
        const parsingNodes = this._parsingNodes;

        type ParsingStep = {
            id: number,
            nestingLevel: number,
            previousStep: ParsingStep,
            returnStep?: ParsingStep
            node: ParsingNode,
            mainNode?: ParsingNode
            matchingToken?: Token
        }

        let nextIndex = 0;

        const rootStep: ParsingStep = {
            id: nextIndex++,
            nestingLevel: 0,
            previousStep: null,
            node: this._startParsingNode,
            mainNode: this._startParsingNode
        }

        let endStep: ParsingStep = null;
        let toVisit: ParsingStep[] = [rootStep],
            toVisitNext: ParsingStep[] = [];

        let tokenIter: IteratorResult<Token> = null;

        /*
            explore the parsing graph to find a covering path
            visit che path to build the ast
         */

        while ((tokenIter = tokens.next())) {
            /*
             for each token, including when tokenIterator.done is true (no token)
             */
            const _token = tokenIter.value;
            if (this.debug) {
                console.debug(`Parse ${_token?.term}`);
            }
            const _visited = new Set<ParsingStep>();
            while (toVisit.length) {
                const _step = toVisit.shift();
                if (_visited.has(_step)) {
                    throw new Error(`Found a loop: ${_step.id}`)
                }
                _visited.add(_step);
                const _node = _step.node;
                if (this.debug) {
                    console.debug(` ${" ".repeat(_step.nestingLevel)}(${_step.id}) ${_node.id}`);
                }
                switch (_node.nodeType) {
                    case ParsingNodeType.RULE_START:
                    case ParsingNodeType.GROUP_START:
                    case ParsingNodeType.GROUP_END:
                        toVisit.unshift(...[..._node.children.values()]
                            .map(n => {
                                return {
                                    id: nextIndex++,
                                    nestingLevel: _step.nestingLevel + (_node.nodeType === ParsingNodeType.GROUP_END ? -1 : +1),
                                    previousStep: _step,
                                    node: n,
                                    mainNode: _step.mainNode,
                                    returnStep: _step.returnStep
                                }
                            }));
                        break;
                    case ParsingNodeType.RULE_END:
                        _step.nestingLevel -= 1;
                        const returnWalkNode = _step.returnStep
                        if (returnWalkNode) {
                            toVisit.unshift(...[...returnWalkNode.node.children]
                                .map(n => {
                                    return {
                                        id: nextIndex++,
                                        nestingLevel: returnWalkNode.nestingLevel,
                                        previousStep: _step,
                                        node: n,
                                        mainNode: returnWalkNode.mainNode,
                                        returnStep: returnWalkNode.returnStep
                                    }
                                }));
                        } else {
                            // continue just to be sure there is a better match
                            endStep = _step;
                        }
                        break;
                    case ParsingNodeType.RULE_REFERENCE:
                        const nextGrammarNode = parsingNodes.get(_node.mustExpandToRuleName);
                        toVisit.unshift({
                            id: nextIndex++,
                            nestingLevel: _step.nestingLevel + 1,
                            previousStep: _step,
                            node: nextGrammarNode,
                            mainNode: nextGrammarNode,
                            returnStep: _step
                        });
                        break;
                    case ParsingNodeType.TERMINAL:
                        _visited.clear()
                        if (_node.mustMatchTerm === _token?.term) {
                            _step.matchingToken = _token;
                            if (this.debug) {
                                console.debug(`> Match ${_token?.term}`)
                            }
                            toVisitNext.unshift(...[..._node.children.values()]
                                .map(n => {
                                    return {
                                        id: nextIndex++,
                                        nestingLevel: _step.nestingLevel,
                                        previousStep: _step,
                                        node: n,
                                        mainNode: _step.mainNode,
                                        returnStep: _step.returnStep
                                    }
                                }));
                        }
                        break;
                    default:
                        throw new Error(`Parsing error: grammar node type not implemented: ${_node.nodeType}`);
                }

            } // end single toVisit element visit

            toVisit = toVisitNext;
            toVisitNext = [];

            if (tokenIter.done || toVisit.length === 0) {
                break;
            }
        } // end term visit

        if (!endStep || endStep.mainNode !== rootStep.mainNode) {
            console.error(`Parsing error: input doesn't match the grammar`)
        }

        if (!tokenIter.done) {
            const currentTerm = tokenIter.value;
            const content = [currentTerm, ...tokens].slice(0, 6).map(t => t.content).join(" ");
            console.error(`Parser error: parser stops, no match for term '${currentTerm.term}': '${currentTerm.content}' at \n${content}`);
        }

        /*
         build the ast following the steps backwards
         */
        let _parentSyntaxNodes: SyntaxNode[] = []
        let rootSyntaxNode: SyntaxNode = null;
        let _step = endStep;
        while (_step) {
            let _parent = _parentSyntaxNodes[0]
            if (this.debug) {
                console.log(`${" ".repeat(_step.nestingLevel)}${_step.mainNode.id}.${_step.node.id}`)
            }
            switch (_step.node.nodeType) {
                case ParsingNodeType.RULE_END: {
                    // append new parent
                    let _newNode: SyntaxNode | SyntaxNode[] = {
                        id: _step.mainNode.id,
                        type: _step.mainNode.originRuleName,
                        parent: _parent,
                        children: []
                    };
                    _parentSyntaxNodes.unshift(_newNode)
                    if (_parent) {
                        if (_step.node.syntaxNodeFactoryFun) {
                            _newNode = _step.node.syntaxNodeFactoryFun({
                                node: _newNode
                            })
                        }
                        if (Array.isArray(_newNode)) {
                            _parent.children.unshift(..._newNode)
                        } else {
                            _parent.children.unshift(_newNode)
                        }
                    } else {
                        rootSyntaxNode = _parentSyntaxNodes[0]
                    }
                    break;
                }
                case ParsingNodeType.RULE_START: {
                    // remove parent
                    _parentSyntaxNodes.shift();
                    break;
                }
                case ParsingNodeType.TERMINAL: {
                    // add as child of current parent
                    let _newNode: SyntaxNode | SyntaxNode[] = {
                        id: _step.node.id,
                        type: _step.matchingToken.term,
                        content: _step.matchingToken.content,
                        parent: _parent
                    }
                    if (_step.node.syntaxNodeFactoryFun) {
                        _newNode = _step.node.syntaxNodeFactoryFun({
                            node: _newNode
                        })
                    }
                    if (Array.isArray(_newNode)) {
                        _parent.children.unshift(..._newNode)
                    } else {
                        _parent.children.unshift(_newNode)
                    }
                    break;
                }
            }
            _step = _step.previousStep;
        }

        return rootSyntaxNode;
    }

    _initializeParsingGraph() {
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
                        break;
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

    addNode(...nodes
                :
                ParsingNode[]
    ) {
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
