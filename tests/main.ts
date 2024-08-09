import * as fs from "node:fs";
import {grammar} from "../lib/src/grammar"
import {lexicon} from "../lib/src/lexicon";
import {render} from "../lib/src/render";
import {ast} from "../lib/src/ast";
import * as yaml from "js-yaml";
// import * as temple from "./base/lang/temple.js";
import * as temple from "./base/lang/test";

// let content = fs.readFileSync(`${process.cwd()}/asset/template1.html`, "utf8");
let content = "AAAAAABDCCCA"
let templateParser = temple.parser({debug: true});

// let _tokens = _templateParser.tokenizer.tokenize(content);

console.log("LEXICAL TOKENIZATION")
for (let t of [...templateParser.tokenizer.tokenize(content)]) {
    console.log(t);
}

// console.log("\nGRAMMAR")
// console.log(_parser.grammar.toString())

// console.log("\nTOKENIZATION")
// console.log([..._parser.tokenizer.tokenize(content)]);

console.log("\nGRAMMAR")
for (let node of templateParser.grammar.nodes.values()) {
    const padding = 35;
    console.log(
        " " + node.id.padEnd(padding) +
        (node.children ? " → " + [...node.children.values()].map(x => x.id).join(", ") : "")
    );
}

console.log("\nABSTRACT SYNTAX TREE")

let _ast = templateParser.parse(content);
// console.log(JSON.stringify(_ast, null, 2));
// console.log(yaml.dump(_ast));

// console.log("\nAST STRUCTURE")
// console.log(stringify(_ast));

// let templateRenderer = temple.renderer({debug: true});

// console.log("\nRENDER TO HTML")
// let out = templateRenderer.render(_ast, {
//     output: "",
//     contextVariables: {
//         foo: "Hello world!",
//         cond1: true
//     }
// });
// console.log(out.output);


