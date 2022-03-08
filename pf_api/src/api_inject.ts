import { AbsHttpCtx, ApiHttpCtx, current_api_ctx, WsApiHttpCtx } from ".";
import { Reflection } from "./reflection";

const CACHE_INJECT = new Map();
const CACHE_SINGLETON = new Map();
const PROVIDERS = new Map();

function savePropertyInject(target, field) {
    let type = Reflection.getMetadata("design:type", target, field);
    if (!type) {
        return;
    }
    let last = CACHE_INJECT.get(target);
    if (!last) {
        last = new Map();
        CACHE_INJECT.set(target, last);
    }
    last.set(field, type);
}

export function __do_inject(imp: any) {
    if (imp && imp.constructor) {
        let m = CACHE_INJECT.get(imp.constructor.prototype);
        if (m) {
            for (const [k, v] of m) {
                if (v == AbsHttpCtx || v == ApiHttpCtx || v == WsApiHttpCtx) {
                    imp[k] = current_api_ctx();
                } else {
                    if (PROVIDERS.has(v)) {
                        if (PROVIDERS.get(v)) {
                            if (!CACHE_SINGLETON.has(v)) {
                                CACHE_SINGLETON.set(v, __do_inject(new v()));
                            }
                            imp[k] = CACHE_SINGLETON.get(v);
                        } else {
                            imp[k] = __do_inject(new v());
                        }
                    } else {
                        imp[k] = new v();
                    }
                }
            }
        }
    }
    return imp;
}

export function Inject() {
    return function (target: any, targetKey: string): void {
        savePropertyInject(target, targetKey);
    };
}
export function Provider(singleton?: boolean): ClassDecorator {
    return function (t) {
        PROVIDERS.set(t, singleton);
    }
}
// export function Provider<T extends { new (...args: any[]): {} }>(constructor: T) {
//     return class extends constructor{
//     }
// }