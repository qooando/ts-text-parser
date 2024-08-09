# ts-text-parser

Typescript library to parse text using a defined formal grammar, produce a content tree and eventually render it to text
again.

## From source

Build node package locally

```bash
cd lib
npm install --include=dev
npm run release
```

outputs `./dist/qooando-text-parser-[version].tgz`.

Try it with the example:

```bash
cd example
./make.sh
```

# Reference

- https://en.wikipedia.org/wiki/Formal_grammar
- https://en.wikipedia.org/wiki/Metasyntax

# To Do

- [ ] Output ast from parser
- [ ] Render ast
- [ ] Read grammar from formatted files (default tokenizers and parsers)

