        if (!Uint8Array.prototype.slice) {
            Uint8Array.prototype.slice = function () {
                return new Uint8Array(this).subarray(this.arguments);
            }
        }
        if (!Number.isInteger) {
            function ToInteger (n) {
                var t = Number(n);
                return isNaN(t) ? 0 : 1 / t === Infinity || 1 / t == -Infinity || t === Infinity || t === -Infinity ? t : (t < 0 ? -1 : 1) * Math.floor(Math.abs(t))
            }
            Number.isInteger = function (n) {
                return "number" === typeof (n) && (!isNaN(n) && n !== Infinity && n !== -Infinity && ToInteger(n) === n);
            }
            Number.isSafeInteger = function e (r) {
                if ("number" !== typeof (r)) return !1;
                if (isNaN(r) || r === Infinity || r === -Infinity) return !1;
                var t = ToInteger(r);
                return t === r && Math.abs(t) <= Math.pow(2, 53) - 1
            }
        }