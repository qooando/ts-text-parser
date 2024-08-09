import * as q from "qooando-text-parser"
import * as path from "path"
import * as fs from "fs"

let parser = q.parserFromGrammar(path.join(__dirname, "assets", "grammar.abnf"))
let input = fs.readFileSync(path.join(__dirname, "assets", "input.txt"))
let result = parser.parse(input)
console.log(result);

