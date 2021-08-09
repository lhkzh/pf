class LinkNode<T> {
    public prev: LinkNode<T>;
    public next: LinkNode<T>;

    constructor(public data: T) {
        this.data = data;
    }
}

export abstract class AbsQueue<T> implements Iterable<T>{

    public append(cs: Array<T> | AbsQueue<T> = null) {
        cs.forEach(e => this.push(e));
        return this;
    }

    public abstract push(row: T): number;

    public abstract unshift(row: T): number;

    public abstract shift(): T;

    public abstract pop(): T;

    public abstract remove(item: T, eq?: (a: T, b: T) => boolean): boolean;

    public abstract clear();
    public abstract get size():number;

    public abstract forEach(f:(e:T)=>void);
    public abstract reverseForEach(f:(e:T)=>void);
    public abstract trim(f:(e:T)=>boolean);

    public abstract values():IterableIterator<T>;
    [Symbol.iterator](): Iterator<T> {
        return undefined;
    }
}


export class LinkQueue<T> extends AbsQueue<T>{
    private _h: LinkNode<T>;
    private _e: LinkNode<T>;
    private _n: number;

    constructor(cs: Array<T> | AbsQueue<T> = null) {
        super();
        this._n = 0;
        cs && this.append(cs);
    }

    public push(row: T) {
        let node = new LinkNode(row);
        if (!this._h) {
            this._h = node;
            this._e = node;
        } else {
            node.prev = this._e;
            this._e.next = node;
            this._e = node;
        }
        return this._incr();
    }

    public unshift(row: T) {
        let node = new LinkNode(row);
        if (!this._h) {
            this._h = node;
            this._e = node;
        } else {
            node.next = this._h;
            this._h.prev = node;
            this._h = node;
        }
        return this._incr();
    }

    protected _incr() {
        return ++this._n;
    }

    public shift() {
        let r = this._h;
        if (r) {
            this._n--;
            this._h = r.next;
            if (this._n == 1) {
                this._e = null;
            }
        }
        return r ? r.data : undefined;
    }

    public pop() {
        let e = this._e;
        if (e) {
            this._n--;
            this._e = e.prev;
            if (this._n == 1) {
                this._h = null;
            }
        }
        return e ? e.data : undefined;
    }

    /**
     * 删除一个节点数据，这个比较慢，别随意使用
     * @param item
     */
    public remove(item: T) {
        let current = this._h;
        while (current) {
            if (current.data === item) {
                this._n--;
                let p = current.prev;
                let n = current.next;
                if (p) {
                    p.next = n;
                }
                if (n) {
                    n.prev = p;
                    current = n;
                }
                return true;
            } else {
                current = current.next;
            }
        }
        return false;
    }

    public clear() {
        this._h = null;
        this._e = null;
        this._n = 0;
    }

    public get size() {
        return this._n;
    }

    /**
     * 正想循环
     * @param f
     */
    public forEach(f: (e: T) => void) {
        let current = this._h;
        while (current) {
            f(current.data);
            current = current.next;
        }
    }

    /**
     * 反向循环
     * @param f
     */
    public reverseForEach(f: (e: T) => void) {
        let current = this._e;
        while (current) {
            f(current.data);
            current = current.prev;
        }
    }

    /**
     * 过滤后返回一个新的queue
     * @param f
     */
    public filter(f: (e: T) => boolean) {
        let q: LinkQueue<T> = Object.create(this);
        q.clear();
        this.forEach(e => {
            f(e) && q.push(e);
        });
        return q;
    }

    /**
     * 过滤自身
     * @param f
     */
    public trim(f: (e: T) => boolean) {
        let current = this._h;
        while (current) {
            if (!f(current.data)) {
                this._n--;
                let p = current.prev;
                let n = current.next;
                if (p) {
                    p.next = n;
                }
                if (n) {
                    n.prev = p;
                    current = n;
                } else {
                    break;
                }
            } else {
                current = current.next;
            }
        }
        return this;
    }

    private * _values(){
        let current = this._h;
        while (current) {
            yield current.data;
            current = current.next;
        }
    }

    values():IterableIterator<T> {
        return this._values();
    }

    [Symbol.iterator]() {
        return this.values();
    }
}

export class BlockLinkQueue<T> extends LinkQueue<T> {
    private evt: Class_Event;

    constructor(cs: Array<T> | LinkQueue<T> = null) {
        super(cs);
        this.evt = new (require("coroutine").Event)();
    }

    protected _incr() {
        try {
            return super._incr();
        } finally {
            this.evt.set();
        }
    }

    public take(): T {
        if (this.size > 0) {
            return this.pop();
        }
        if (this.evt) {
            this.evt.clear();
            this.evt.wait();
        } else {
            throw new Error("interrupt:queue had destory")
        }
        return this.take();
    }

    public destory() {
        let evt = this.evt;
        if (evt == null) {
            return;
        }
        this.evt = null;
        this.clear();
        evt.set();
    }
}


export class ArrayQueue<T> extends AbsQueue<T>{
    private arr:Array<T>;
    constructor(cs:Array<T>|AbsQueue<T>) {
        super();
        cs && this.append(cs);
    }

    public clear() {
        this.arr.length = 0;
    }

    public pop(): T {
        return this.arr.pop();
    }

    public shift(): T {
        return this.arr.shift();
    }

    public push(row: T): number {
        return this._in(this.arr.push(row));
    }

    public unshift(row: T): number {
        return this._in(this.arr.unshift(row));
    }

    protected _in(n:number){
        return n;
    }

    public remove(item: T, eq: ((a: T, b: T) => boolean) | undefined): boolean {
        let len:number = this.arr.length;
        if(eq){
            this.arr = this.arr.filter(e=>eq(e,item));
        }else{
            this.arr = this.arr.filter(e=>e===item);
        }
        return len!=this.arr.length;
    }

    public get size(): number {
        return this.arr.length;
    }
    public forEach(f: (e: T) => void) {
        this.arr.forEach(f);
    }
    public reverseForEach(f: (e: T) => void) {
        this.arr.reverse().forEach(f);
    }

    public trim(f: (e: T) => boolean) {
        this.arr = this.arr.filter(f);
    }

    values():IterableIterator<T>{
        return this.arr.values();
    }
    [Symbol.iterator]() {
        return this.arr.values();
    }
}

export class BlockArrayQueue<T> extends ArrayQueue<T> {
    private evt: Class_Event;

    constructor(cs: Array<T> | LinkQueue<T> = null) {
        super(cs);
        this.evt = new (require("coroutine").Event)();
    }

    protected _in(n:number) {
        try {
            return super._in(n);
        } finally {
            this.evt.set();
        }
    }

    public take(): T {
        if (this.size > 0) {
            return this.pop();
        }
        if (this.evt) {
            this.evt.clear();
            this.evt.wait();
        } else {
            throw new Error("interrupt:queue had destory")
        }
        return this.take();
    }

    public destory() {
        let evt = this.evt;
        if (evt == null) {
            return;
        }
        this.evt = null;
        this.clear();
        evt.set();
    }
}