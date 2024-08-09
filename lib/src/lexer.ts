import {Token, Term, Lexicon, LexerContext, LexerContextPredicate, LexerContextConsumer} from "./types/lexicon";

export class Lexer {
    log = console;
    lexicon: Lexicon;

    constructor(lexicon: Lexicon) {
        this.lexicon = lexicon;
    }

    * tokenize(raw: string, context: LexerContext = null): Generator<Token> {
        let toTokenize = raw.slice();

        let prevIndex = null;
        let nextIndex = 0;

        context ??= {tokensOutputBuffer: [], tokensOutputBufferMaxLength: 1}
        context.tokensOutputBuffer ??= [];
        context.tokensOutputBufferMaxLength ??= 1;

        /*
         * continue to tokenize until the complete string is tokenized
         * or no more text is tokenized
         */
        while (nextIndex < toTokenize.length && nextIndex != prevIndex) {
            prevIndex = nextIndex;

            for (const rule of this.lexicon) {
                let [_term, _regex, _onMatch, _enable] = rule;

                if (_enable && !_enable(context)) {
                    continue;
                }
                let flags = _regex.flags;
                if (!flags.includes("y")) {
                    flags += "y"
                }
                const regex = new RegExp(_regex, flags);
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
                if (_onMatch) {
                    context.term = rule;
                    context.matches = matches;
                    _onMatch(context)
                } else if (_term) {
                    context.tokensOutputBuffer.push({
                        term: _term,
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
            while (context.tokensOutputBuffer.length > context.tokensOutputBufferMaxLength) {
                yield context.tokensOutputBuffer.shift();
            }
        }

        /*
         * output remaining tokens
         */
        while (context.tokensOutputBuffer.length) {
            yield context.tokensOutputBuffer.shift();
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
