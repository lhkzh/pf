import * as coroutine from "coroutine";
import * as util from "util";
import {LinkQueue} from "./queue";

/**
 * 销毁资源
 * @param e
 * @param err
 */
export function destory_pool_item(e: { close?: () => void, dispose?: () => void, destory?: () => void, clear?: () => void }, err?: boolean) {
    if (e[KEY_LINK_BACK]) {
        e[KEY_LINK_BACK](e, err);
        return;
    }
    try {
        util.isFunction(e.close) && e.close();
        util.isFunction(e.dispose) && e.dispose();
        util.isFunction(e.destory) && e.destory();
        util.isFunction(e.clear) && e.clear();
    } catch (err) {
    }
    try {
        for (let k in e) {
            delete e[k];
        }
    } catch (err) {

    }
}

const KEY_LINK_BACK = "$_SP_BACK";
const KEY_LINK_TIME_LAST = "$_SP_T_LAST";
const KEY_LINK_TIME_INIT = "$_SP_T_INIT";

/**
 * 简单对象池。有借鉴fib-pool
 * @see https://github.com/fibjs/fib-pool/blob/master/src/index.ts
 */
export class SimplePool<T> {
    //给配置的版本号
    private _ver: string;
    //给配置的名字
    private _name: string;
    //资源池是否还保活中
    private _alive: boolean;

    private _fnCreate: () => T;
    private _fnCheck: (d: T) => boolean;

    //限制最大资源个数
    private _limitMax: number;
    //限制空闲资源个数
    private _limitIdel: number;
    //检测资源最大存活时间（例如创建后30分钟必定销毁，则=180000）
    private _maxAliveTs: number;
    //检测资源的最大空闲时间（例如最后一次使用后10分钟关闭，则=60000）
    private _maxIdelTs: number;
    //随机-抽检取出的资源活性
    private _randomBorrow: number;
    //计时器：主动检测资源活性
    private _checkTimer: Class_Timer;
    private _checkIng: boolean;

    //当前资源个数
    private _num: number;
    //当前等待使用的资源池
    private _pool: LinkQueue<T>;
    //当前等待空闲资源的个数
    private _waits: LinkQueue<Class_Event>;

    /**
     * 构造函数
     * @param conf
     */
    constructor(conf: { name?: string, ver?: string, create: () => T, check?: (d: T) => boolean, max?: number, idel?: number, maxAlive?: number, maxIdel?: number, randomBorrowCheck?: number }) {
        this._ver = conf.ver || "0.0";
        this._name = conf.name || "main";
        this._alive = true;

        this._num = 0;//当前一共保持活跃的链接数（未归还的以及list中的总数）
        this._pool = new LinkQueue<T>();//缓存链接
        this._waits = new LinkQueue<Class_Event>();//所有等待空闲的 event
        this._limitMax = conf.max ? conf.max : 16;//同时最大产生的对象（在工作的连接数）
        this._limitIdel = Math.min(conf.idel ? conf.idel : 0, this._limitMax);//空闲最大连接数（连接池不放那么多）
        this._maxAliveTs = conf.maxAlive ? conf.maxAlive * 1000 : 1800000;//一个链接最大存活时间（超过后在检测时关闭掉）
        this._maxIdelTs = conf.maxIdel ? conf.maxIdel * 1000 : 120000;//最大空闲时间（一个链接多久没干活后关闭掉）

        this._randomBorrow = Number.isFinite(conf.randomBorrowCheck) ? conf.randomBorrowCheck : 0.02;

        this._fnCreate = conf.create;
        this._fnCheck = util.isFunction(conf.check) ? conf.check : (d: T) => {
            return true;
        };
        this._back = this._back.bind(this);
        this.check = this.check.bind(this);
        this.dispose = this.dispose.bind(this);
    }

    public get ver(): string {
        return this._ver;
    }

    public get name(): string {
        return this._name;
    }

    public get alive(): boolean {
        return this._alive;
    }

    public toStatJson() {
        return {
            name: this._name, ver: this._ver, num: this._num, pool: this._pool.size, wait: this._waits.size
        }
    }

    /**
     * 开始定时检测资源活性
     * @param intervalTs
     */
    public startAutoCheck(intervalTs: number = 15000) {
        if (!this._checkTimer) {
            clearInterval(this._checkTimer);
        }
        this._checkTimer = setInterval(this.check, intervalTs);
        return this;
    }

    /**
     * 检测资源可用性
     * @param d
     * @param ignoreBorrow
     * @param nowTS
     * @private
     */
    private _checkOk(d: T, ignoreBorrow: boolean, nowTS?: number) {
        try {
            if (!ignoreBorrow && d[KEY_LINK_BACK]) {
                return true;
            }
            if (nowTS) {
                if ((d[KEY_LINK_TIME_INIT] + this._maxAliveTs) < nowTS) {
                    return false;
                }
                if ((d[KEY_LINK_TIME_LAST] + this._maxIdelTs) < nowTS) {
                    return false;
                }
            }
            return this._fnCheck(d);
        } catch (e) {
            // console.warn("check_bad",e.message);
            return false
        }
    }

    /**
     * 对池内资源进行检测
     */
    public check() {
        if(this._checkIng){
            return;
        }
        this._checkIng = true;
        try{
            let nowTs = Date.now();
            let list = this._pool;
            let drops = [];
            list.forEach(d => {
                if (!this._checkOk(d, false, nowTs)) {
                    if (!d[KEY_LINK_BACK]) {
                        drops.push(d);
                    }
                }
            });
            if (drops.length) {
                if (this._alive) {
                    list.trim(e => drops.includes(e));
                    this._num -= drops.length;
                    try {
                        if (this._num == 0 && list.size == 0) {
                            this._create(true);
                        }
                    } catch (ex) {
                    }
                }
                drops.forEach(e => destory_pool_item(e));
            }
        }finally {
            this._checkIng = false;
        }
    }

    //等待池空闲执行
    private _wait() {
        if (this._waits.size || (this._num > this._limitMax && this._pool.size < 1)) {
            let evt = new coroutine.Event();
            this._waits.push(evt);
            // let t=Date.now();console.warn("pool_wait--begin...",this.name);
            evt.wait();
            // console.warn("pool_wait--over...",this.name,Date.now()-t,this._num);
        }
    }

    //唤醒等待中的任务
    private _notify() {
        let e = this._waits.shift();
        e && e.set();
    }

    private _back(item: T, err: boolean) {
        if (this._alive == false) {//版本不对，不归还到池里去了，直接销毁
            destory_pool_item(item);
            // console.error("change_pool_i_ver",this.name,this._num,this._pool.length)
            this._num--;
            this._notify();
        } else if (this._pool.size > this._limitMax || (err && !this._checkOk(item, true))) {//超出池大小 或者有错误且链接ping不通，直接销毁
            destory_pool_item(item);
            this._num--;
            // console.warn("pool--",this.name,this._num,this._pool.length)
            this._notify();
        } else {
            delete item[KEY_LINK_BACK];
            item[KEY_LINK_TIME_LAST] = Date.now();
            this._pool.push(item);
            // console.warn("pool--",this.name,this._num,this._pool.length)
            this._notify();
        }
    }

    //借出链接-资源
    public borrow() {
        this._wait();
        // console.warn("pool++",this.name,this._num,this._pool.length)
        let e = this._pool.shift();
        if (!e) {
            e[KEY_LINK_BACK] = this._back;
            if (this._randomBorrow > 0 && Math.random() < this._randomBorrow && this._checkOk(e, true) == false) {
                this._num--;
                delete e[KEY_LINK_BACK];
                destory_pool_item(e);
            } else {
                return e;
            }
        }
        e = this._create(false);
        e[KEY_LINK_BACK] = this._back;
        return e;
    }

    private _create(idel: boolean) {
        this._num++;
        try {
            let e = this._fnCreate();
            e[KEY_LINK_TIME_LAST] = e[KEY_LINK_TIME_INIT] = Date.now();
            if (idel) {
                this._pool.push(e);
            }
            return e;
        } catch (err) {
            this._num--;
            throw err;
        }
    }

    public dispose(cleanWaitTtl = 6180) {
        let T = this;
        if (!T._alive) {
            return;
        }
        T._alive = true;
        T._checkTimer && clearInterval(T._checkTimer);
        T._num = -0xffff;
        let _drop_fn = (T, tryNum) => {
            while (T._waits.size > 0) {
                try {
                    T._notify();
                } catch (e) {
                }
            }
            coroutine.sleep(cleanWaitTtl);
            while (T._waits.size > 0) {
                try {
                    T._notify();
                } catch (e) {
                }
            }
            let list = T._pool;
            T._pool = new LinkQueue<T>();
            list.forEach(e => destory_pool_item(e));
            tryNum > 0 && coroutine.start(_drop_fn, T, --tryNum);
        }
        coroutine.start(_drop_fn, T, 3);
    }
}