
class LinkNode<T> {
    public prev: LinkNode<T>;
    public next: LinkNode<T>;

    constructor(public data: T) {
        this.data = data;
    }
}

export class LinkQueue<T> {
    private _h: LinkNode<T>;
    private _e: LinkNode<T>;
    private _n: number;

    constructor() {
        this._n = 0;
    }

    public add(row: T) {
        let node = new LinkNode(row);
        if (!this._h) {
            this._h = node;
            this._e = node;
        } else {
            node.prev = this._e;
            this._e.next = node;
            this._e = node;
        }
        this._n++;
    }

    public shift() {
        let r = this._h;
        if (r != null) {
            this._n--;
            this._h = r.next;
            if (this._n == 1) {
                this._e = null;
            }
        }
        return r ? r.data : null;
    }

    public pop() {
        let e = this._e;
        if (e != null) {
            this._n--;
            this._e = e.prev;
            if (this._n == 1) {
                this._h = null;
            }
        }
        return e ? e.data : null;
    }

    /**
     * 删除一个节点数据，这个比较慢，别随意使用
     * @param item
     */
    public remove(item:T){
        let current = this._h;
        while (current !== null) {
            if (current.data===item) {
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
        while (current !== null) {
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
        while (current !== null) {
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
            f(e) && q.add(e);
        });
        return q;
    }

    /**
     * 过滤自身
     * @param f
     */
    public trim(f: (e: T) => boolean) {
        let current = this._h;
        while (current !== null) {
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

    * values() {
        let current = this._h;
        while (current !== null) {
            yield current.data;
            current = current.next;
        }
    }

    [Symbol.iterator]() {
        return this.values();
    }
}

export class BlockLinkQueue<T> extends LinkQueue<T> {
    private evt: Class_Event;

    constructor() {
        super();
        this.evt = new (require("coroutine").Event)();
    }

    public add(row) {
        super.add(row);
        this.evt.set();
    }

    public take() {
        if (this.size > 0) {
            return this.pop();
        }
        this.evt.clear();
        this.evt.wait();
        return this.pop();
    }

    public clear() {
        super.clear();
        this.evt.set();
    }
}
