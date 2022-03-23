import { AbsHttpCtx, ApiHttpCtx, current_api_ctx, WsApiHttpCtx } from ".";
import { Reflection } from "./reflection";

const CACHE_INJECT: Map<any, Map<string, { type: any, fn?: Function }>> = new Map();
const CACHE_SINGLETON = new Map();
const PROVIDERS = new Map();

function savePropertyInject(target, field, fn: Function) {
    let type = Reflection.getMetadata("design:type", target, field);
    if (!type) {
        return;
    }
    let last = CACHE_INJECT.get(target);
    if (!last) {
        last = new Map();
        CACHE_INJECT.set(target, last);
    }
    last.set(field, { type: type, fn: fn });
}

function __do_inject<T>(imp: T): T {
    if (imp && imp.constructor) {
        let m = CACHE_INJECT.get(imp.constructor.prototype);
        if (m) {
            for (const [k, v] of m) {
                if (v.type == AbsHttpCtx || v.type == ApiHttpCtx || v.type == WsApiHttpCtx) {
                    imp[k] = current_api_ctx();
                } else {
                    if (!v.fn && PROVIDERS.has(v.type)) {
                        if (PROVIDERS.get(v.type)) {
                            if (!CACHE_SINGLETON.has(v.type)) {
                                CACHE_SINGLETON.set(v.type, __do_inject(new v.type()));
                            }
                            imp[k] = CACHE_SINGLETON.get(v.type);
                        } else {
                            imp[k] = __do_inject(new v.type());
                        }
                    } else {
                        imp[k] = v.fn.apply(imp);
                    }
                }
            }
        }
    }
    return imp;
}

export function tryInjectNew<T>(Type: new (...args) => T, ...Args): T {
    return __do_inject(new Type(...Args));
}

export function Inject(fn?: Function) {
    return function (target: any, targetKey: string): void {
        savePropertyInject(target, targetKey, fn);
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