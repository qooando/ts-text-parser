export namespace lexicon {

    export interface Term {
        term: string
        content: string

        [x: string]: any
    }

    export interface LexerContext {
        termsBuffer?: Term[]
        termsBufferMaxLength?: number
        rule?: TermDefinition
        matches?: any[]

        [x: string]: any
    }

    export type LexerConsumer = (ctx: LexerContext) => void;
    export type LexerPredicate = (ctx: LexerContext) => boolean;

    /*
     * Rules are a simple set of regex and relative things to do on match
     * you must specify the regex and the label/onMatch
     */
    export interface TermDefinition {
        term: string
        regex: RegExp
        enable?: LexerPredicate
        onMatch?: LexerConsumer
    }

    export type TermDefinitionTuple =
        [string, RegExp, LexerConsumer]
        | [string, RegExp, LexerConsumer, LexerPredicate];

    export type Lexicon = TermDefinition[] | TermDefinitionTuple[];

    export let isTermDefinition = (x: any) => x && "term" in x && "regex" in x;
    export let isArrayOfTermDefinition = (x: any) => x && Array.isArray(x) && isTermDefinition(x[0]);
    export let isTermDefinitionTuple =
        (x: any) => x && Array.isArray(x) && x.length >= 2 && x.length <= 3
            && typeof x[0] === "string" && x[1].constructor.name === "RegExp"
    export let isArrayOfTermDefinitionTuple = (x: any) => x && Array.isArray(x) && isTermDefinitionTuple(x[0]);

    export class Lexer {
        log = console;
        definitionsInInsertionOrder: TermDefinition[];

        constructor(lexicon: Lexicon) {
            if (isArrayOfTermDefinitionTuple(lexicon)) {
                this.definitionsInInsertionOrder = (lexicon as TermDefinitionTuple[])
                    .map(x => {
                        return {
                            term: x[0],
                            regex: x[1],
                            onMatch: x[2],
                            enable: x[3]
                        }
                    });
            } else {
                this.definitionsInInsertionOrder = lexicon as TermDefinition[];
            }
        }

        * tokenize(raw: string, context: LexerContext = null): Generator<Term> {
            let toTokenize = raw.slice();

            let prevIndex = null;
            let nextIndex = 0;

            context ??= {termsBuffer: [], termsBufferMaxLength: 1}
            context.termsBuffer ??= [];
            context.termsBufferMaxLength ??= 1;

            /*
             * continue to tokenize until the complete string is tokenized
             * or no more text is tokenized
             */
            while (nextIndex < toTokenize.length && nextIndex != prevIndex) {
                prevIndex = nextIndex;

                for (const rule of this.definitionsInInsertionOrder) {
                    if (rule.enable && !rule.enable(context)) {
                        continue;
                    }
                    let flags = rule.regex.flags;
                    if (!flags.includes("y")) {
                        flags += "y"
                    }
                    const regex = new RegExp(rule.regex, flags);
                    regex.lastIndex = nextIndex;
                    const matches = regex.exec(toTokenize);
                    /*
                     * if matches is null or the match start index is not correct, then NO MATCH
                     */
                    if (!matches /*|| regex.lastIndex.index != prevIndex // USE STICKY */) {
                        continue
                    }
                    /*
                     * update next index
                     */
                    nextIndex = nextIndex + matches[0].length;
                    if (rule.onMatch) {
                        context.rule = rule;
                        context.matches = matches;
                        rule.onMatch(context)
                    } else if (rule.term) {
                        context.termsBuffer.push({
                            term: rule.term,
                            content: matches[0]
                        });
                    } else {
                        throw new Error(`label or onMatch must be provided`);
                    }
                    break;
                }

                /*
                 * if buffer grows, just output older tokens
                 */
                while (context.termsBuffer.length > context.termsBufferMaxLength) {
                    yield context.termsBuffer.shift();
                }
            }

            /*
             * output remaining tokens
             */
            while (context.termsBuffer.length) {
                yield context.termsBuffer.shift();
            }

            if (nextIndex < toTokenize.length) {
                this.log.error(`Text not fully tokenized, ${toTokenize.length - nextIndex} chars left, unknown token:\n${toTokenize.slice(nextIndex, nextIndex + 25)}`);
            }
        }
    }

    export function lexer(lexicon: Lexicon) {
        return new Lexer(lexicon);
    }

    export let tokenizer = lexer;

    export namespace onMatch {
        export function ignore(ctx: lexicon.LexerContext) {
        }

        export function concatSameTerm(ctx: lexicon.LexerContext) {
            let top = ctx.termsBuffer[ctx.termsBuffer.length - 1];
            let label = ctx.rule.term;
            if (top && top.term === label) {
                top.content += ctx.matches[0];
            } else {
                ctx.termsBuffer.push({
                    term: label,
                    content: ctx.matches[0]
                });
            }
        }
    }

}