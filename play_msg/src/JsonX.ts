
export class JsonX {
    public static Stringify(val: any, space?: number | string): string {
        return JSON.stringify(val, JsonReviverEncode, space);
    }
    public static Parse(jsonStr: string): any {
        return JSON.parse(jsonStr, JsonReviverDecode);
    }
}

function JsonReviverEncode(key: string, value: any): any {
    if (typeof (value) == "bigint") {
        return {
            type: "bigint",
            data: value.toString(),
        };
    } else if (value instanceof Map) {
        return {
            type: "Map",
            data: Array.from(value.entries()),
        };
    } else if (value instanceof Set) {
        return {
            type: "Set",
            data: Array.from(value.entries()),
        };
    } else if (value && value.buffer instanceof ArrayBuffer) {
        return {
            type: value.constructor.name,
            data: Array.from(value),
        };
    }
    return value;
}
function JsonReviverDecode(key: any, value: any) {
    if (typeof value === 'string') {
        let a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                +a[5], +a[6]));
        }
    } else if (typeof (value) == "object" && typeof (value.type) == "string" && value.data) {
        if (value.type == "bigint") {
            return MsgArray.CastInt64(value.data);
        }
        if (value.type == "Map") {
            return new Map(value.data);
        }
        if (value.type == "Set") {
            return new Set(value.data);
        }
        if (value.type.lastIndexOf("Array") > 0) {
            let G: any = typeof (window) == "object" ? window : global;
            return new G[value.type](value.data);
        }
    }
    return value;
}
import { MsgArray } from "./index";