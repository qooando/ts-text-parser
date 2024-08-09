import {LexerContext} from "../types/lexicon";

export namespace onMatch {

    export function ignore(ctx: LexerContext) {
    }

    export function concatSameTerm(ctx: LexerContext) {
        let top = ctx.tokensOutputBuffer[ctx.tokensOutputBuffer.length - 1];
        let [label, rgx, onMatch, enable] = ctx.term;
        if (top && top.term === label) {
            top.content += ctx.matches[0];
        } else {
            ctx.tokensOutputBuffer.push({
                term: label,
                content: ctx.matches[0]
            });
        }
    }
}
