export namespace iterators {

    export function buffered(iterator: Iterator<any>) {
        return new BufferedIterator(iterator);
    }

    export class BufferedIterator<T, TReturn = any, TNext = undefined>
        implements Iterator<T, TReturn, TNext>, Iterable<T | TReturn> {
        iterator: Iterator<T, TReturn, TNext>;
        buffer: IteratorResult<T, TReturn>[];
        cursor: number;
        marks: number[];

        constructor(iterator: Iterator<T, TReturn, TNext>) {
            this.iterator = iterator;
            this.cursor = 0;
            this.marks = [];
            this.buffer = [];
        }

        nextValue(...args: [] | [TNext]): T | TReturn {
            return this.next(...args).value;
        }

        // next but without pop
        peekValue(...args:[] | [TNext]): T | TReturn {
            try {
                this.mark();
                return this.nextValue(...args);
            } finally {
                this.reset();
            }
        }

        next(...args: [] | [TNext]): IteratorResult<T, TReturn> {
            let x: IteratorResult<T, TReturn> = null;
            if (this.buffer.length === this.cursor) {
                x = this.iterator.next(...args);
                this.buffer.push(x);
            } else {
                x = this.buffer.at(this.cursor);
            }
            // if we have marks increase cursor
            // otherwise just leave cursor where it is and unshift the buffer
            if (this.marks.length) {
                this.cursor++;
            } else {
                this.buffer.shift();
            }
            return x;
        }

        mark() {
            this.marks.push(this.cursor);
        }

        unmark() {
            this.marks.pop();
        }

        reset() {
            this.cursor = this.marks.pop();
            this.shiftUnusedBuffer();
        }

        shiftUnusedBuffer() {
            let minCursor = Math.min(this.cursor, ...this.marks);
            this.cursor -= minCursor;
            this.marks = this.marks.map(x => x - minCursor);
            for (let i = 0; i < minCursor; i++) {
                this.buffer.shift()
            }
        }

        [Symbol.iterator](): Iterator<T | TReturn> {
            return this;
        }
    }

}