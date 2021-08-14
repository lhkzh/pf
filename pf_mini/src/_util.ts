import * as ssl from "ssl";
import * as xml from "xml";
import * as util from "util";

ssl.loadRootCerts();

export interface CacheObj {
    get(k: string): string;

    set(k: string, v: string, ttl: number);

    del(k: string);
}

/**
 * 进程内-内存缓存
 */
class MemCacheObj implements CacheObj {
    private cache: Map<string, { v: any, t: number }>;
    private timer: Class_Timer;

    constructor() {
        this.cache = new Map<string, { v: any; t: number }>();
        this.ttl = this.ttl.bind(this);

    }

    private ttl(is_del: boolean) {
        if (is_del) {
            if (this.cache.size > 0) {
                return;
            }
        }
        clearTimeout(this.timer);
        let now = Date.now();
        this.cache.forEach((e, k) => {
            if (e.t < now) {
                this.cache.delete(k);
            }
        });
        if (this.cache.size) {
            this.timer = setTimeout(this.ttl, 2000);
        } else {
            this.timer = null;
        }
    }

    private startTtl() {
        if (!this.timer) {
            this.timer = setTimeout(this.ttl, 2000);
        }
    }

    public get(k: string): string {
        let r = this.cache.get(k);
        if (r) {
            if (r.t > Date.now()) {
                this.del(k);
            } else {
                return r.v;
            }
        }
        return null;
    }

    public set(k: string, v: string, ttl: number) {
        let r = {v: v, t: Date.now() + ttl * 1000};
        this.cache.set(k, r);
        if (this.cache.size == 1) {
            this.startTtl();
        }
    }

    public del(k: string) {
        this.cache.delete(k) && this.ttl(true);
    }

    public destory() {
        this.cache = null;
        clearTimeout(this.timer);
    }
}

let cache_global_tmp_key = "$_pf_wx_cache:" + __filename;
let cacheObj: CacheObj = global[cache_global_tmp_key] || new MemCacheObj();

/**
 * 设置缓存客户端
 * @param obj
 */
export function setCacheHandler(obj: CacheObj) {
    if (!obj) {
        return;
    }
    if (cacheObj instanceof MemCacheObj) {
        (<MemCacheObj>cacheObj).destory();
        delete global[cache_global_tmp_key];
    }
    cacheObj = obj;
}

export function getCacheHandler() {
    return cacheObj;
}