
let StrCoder: { encode: (str: string) => Uint8Array, decode: (buf: Uint8Array) => string };
const __GLOBAL: any = typeof (window) == "object" ? window : global;
const __IS_FIBJS = __GLOBAL.process && __GLOBAL.process.versions && __GLOBAL.process.versions.fibjs;
if (!__IS_FIBJS && typeof (Buffer) != "undefined") {
    StrCoder = {
        encode(str: string) {
            return new Uint8Array(Buffer.from(str, "utf8"));
        },
        decode(buf: Uint8Array) {
            return Buffer.from(buf).toString("utf8");
        }
    }
} else if (!__IS_FIBJS && typeof (TextEncoder) != "undefined") {
    const tE = new TextEncoder();
    const tD = new TextDecoder("utf-8");
    StrCoder = {
        encode(str: string) {
            return tE.encode(str);
        },
        decode(buf: Uint8Array) {
            return tD.decode(buf);
        }
    }
} else {
    StrCoder = {
        encode(str: string) {
            let buf = new Uint8Array(str.length * 4), pos = 0,
                c1, // character 1
                c2; // character 2
            for (let i = 0; i < str.length; ++i) {
                c1 = str.charCodeAt(i);
                if (c1 < 128) {
                    buf[pos++] = c1;
                } else if (c1 < 2048) {
                    buf[pos++] = c1 >> 6 | 192;
                    buf[pos++] = c1 & 63 | 128;
                } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = str.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
                    c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
                    ++i;
                    buf[pos++] = c1 >> 18 | 240;
                    buf[pos++] = c1 >> 12 & 63 | 128;
                    buf[pos++] = c1 >> 6 & 63 | 128;
                    buf[pos++] = c1 & 63 | 128;
                } else {
                    buf[pos++] = c1 >> 12 | 224;
                    buf[pos++] = c1 >> 6 & 63 | 128;
                    buf[pos++] = c1 & 63 | 128;
                }
            }
            return buf.subarray(0, pos);
        },
        decode(buf: Uint8Array) {
            let arr: number[] = [];
            for (let i = 0, j = 0; i < buf.length;) {
                let t = buf[i++];
                if (t <= 0x7F) {
                    arr[j++] = t;
                } else if (t >= 0xC0 && t < 0xE0) {
                    arr[j++] = (t & 0x1F) << 6 | buf[i++] & 0x3F;
                } else if (t >= 0xE0 && t < 0xF0) {
                    arr[j++] = (t & 0xF) << 12 | (buf[i++] & 0x3F) << 6 | buf[i++] & 0x3F;
                } else if (t >= 0xF0) {
                    let t2 = ((t & 7) << 18 | (buf[i++] & 0x3F) << 12 | (buf[i++] & 0x3F) << 6 | buf[i++] & 0x3F) - 0x10000;
                    arr[j++] = 0xD800 + (t2 >> 10);
                    arr[j++] = 0xDC00 + (t2 & 0x3FF);
                }
            }
            return String.fromCharCode.apply(String, arr);
        }
    }
}
export class Str {
    public static encode(str: string): Uint8Array {
        return StrCoder.encode(str);
    }
    public static decode(buf: Uint8Array): string {
        return StrCoder.decode(buf);
    }
}