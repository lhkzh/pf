class LinkNode<T> {
    public prev: LinkNode<T>;
    public next: LinkNode<T>;

    constructor(public data: T) {
        this.data = data;
    }
}

export abstract class AbsQueue<T> implements Iterable<T> {

    public append(cs: Array<T> | AbsQueue<T> = null) {
        cs.forEach(e => this.push(e));
        return this;
    }

    public abstract push(row: T): number;

    public abstract unshift(row: T): number;

    public abstract shift(): T;

    public abstract pop(): T;

    public abstract clear();

    public abstract get size(): number;

    public abstract forEach(f: (e: T) => void);

    public abstract reverseForEach(f: (e: T) => void);

    public abstract trim(f: (e: T) => boolean);

    public abstract values(): IterableIterator<T>;

    [Symbol.iterator](): Iterator<T> {
        return undefined;
    }
}


export class LinkQueue<T> extends AbsQueue<T> {
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
        if (!this._h || !this._e) {
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
        if (!this._h || !this._e) {
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
        let e = this._h;
        if (e) {
            this._n--;
            this._h = e.next;
            if (this._h) {
                this._h.prev = null;
            } else {
                this._e = null;
            }
        }
        return e ? e.data : undefined;
    }

    public pop() {
        let e = this._e;
        if (e) {
            this._n--;
            this._e = e.prev;
            if (this._e) {
                this._e.next = null;
            } else {
                this._h = null;
            }
        }
        return e ? e.data : undefined;
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
     * @param checkRemoveFn
     */
    public trim(checkRemoveFn: (e: T) => boolean) {
        let current = this._h;
        while (current) {
            if (checkRemoveFn(current.data)) {
                this._n--;
                if (current.next) {
                    current.next.prev = current.prev;
                }
                if (current.prev) {
                    current.prev.next = current.next;
                }
                if (current == this._h) {
                    this._h = current.next;
                }
                if (current == this._e) {
                    this._e = current.prev;
                }
                current = current.next;
            } else {
                current = current.next;
            }
        }
        return this;
    }

    private* _values() {
        let current = this._h;
        while (current) {
            yield current.data;
            current = current.next;
        }
    }

    values(): IterableIterator<T> {
        return this._values();
    }

    [Symbol.iterator]() {
        return this.values();
    }
}


export class ArrayQueue<T> extends AbsQueue<T> {
    private arr: Array<T>;

    constructor(cs: Array<T> | AbsQueue<T>) {
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

    protected _in(n: number) {
        return n;
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

    values(): IterableIterator<T> {
        return this.arr.values();
    }

    [Symbol.iterator]() {
        return this.arr.values();
    }
}

export class BlockLinkQueue<T> extends LinkQueue<T> {
    private evt: Class_Event;
    private lck: Class_Lock;

    constructor(cs: Array<T> | LinkQueue<T> = null) {
        super(cs);
        this.evt = new (require("coroutine").Event)();
        this.lck = new (require("coroutine").Lock)();
    }

    protected _incr() {
        try {
            return super._incr();
        } finally {
            this.evt.pulse();
        }
    }

    public take(): T {
        this.lck.acquire();
        try {
            while (this.size < 1) {
                this.evt.wait();
            }
            return this.shift();
        } finally {
            this.lck.release();
        }
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

export class BlockArrayQueue<T> extends ArrayQueue<T> {
    private evt: Class_Event;
    private lck: Class_Lock;

    constructor(cs: Array<T> | LinkQueue<T> = null) {
        super(cs);
        this.evt = new (require("coroutine").Event)();
        this.lck = new (require("coroutine").Lock)();
    }

    protected _in(n: number) {
        try {
            return super._in(n);
        } finally {
            this.evt.pulse();
        }
    }

    public take(): T {
        this.lck.acquire();
        try {
            while (this.size < 1) {
                this.evt.wait();
            }
            return this.shift();
        } finally {
            this.lck.release();
        }
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

export class CircleQueue<T>{
    //    数组的最大容量
    protected maxSize:number;
    //    front指向队列的第一个元素，初始值为0
    protected front:number;
    //    rear指向队列的最后一个元素的后一个位置，空出一个空间作为约定，初始值为0
    protected rear:number;
    //    存放数据，模拟队列
    protected arr:T[];

    //    创建队列构造器
    public CircleQueue(maxSize:number) {
        this.maxSize = maxSize;
        this.front = 0;
        this.rear = 0;
        this.arr = new Array(maxSize);
    }

    //    判断队列是否已满
    public isFull():boolean {
        return (this.rear + 1) % this.maxSize == this.front;
    }

    //    判断队列是否为空
    public isEmpty():boolean {
        return this.rear == this.front;
    }

    //    查看队列数据,显示队列所有数据
    public dump() {
        if (this.isEmpty()) {
            console.log("队列为空，没有数据！");
            return;
        }
        //从front开始遍历，注意遍历的元素个数
        for (var i = this.front; i < this.front + this.size(); i++) {
            console.log(`arr[${i%this.maxSize}] = ${this.arr[i % this.maxSize]}`);
        }
    }

    //    求出当前队列有效数据的个数
    public size():number {
        return (this.rear + this.maxSize - this.front) % this.maxSize;
    }

    //    添加数据到队列
    public offer(n:T) {
        if(n===undefined){
            throw new RangeError("bad paramter");
        }
        if (this.isFull()) {
            return false;
        }
        this.arr[this.rear] = n;
        this.rear = (this.rear + 1) % this.maxSize;
        return true;
    }

    //    显示队列的头数据，注意不是取出数据
    public head():T {
        if(this.isEmpty()){
            return undefined;
        }
        return this.arr[this.front];
    }
    //    从队列取出数据,，出队列
    public poll():T {
        if(this.isEmpty()){
            return undefined;
        }
        //        这里需要分析出front是指向队列的第一个元素
        //        1. 先把front对应的值保留到一个临时变量
        //        2. 将front后移，考虑取模
        //        3. 将临时保存的变量取回
        let value = this.arr[this.front];
        this.arr[this.front] = undefined;
        this.front = (this.front + 1) % this.maxSize;
        return value;
    }
}