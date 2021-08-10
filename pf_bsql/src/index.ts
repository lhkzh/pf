export type BsqlMATH = '+' | '-' | '*' | '/' | '=';
export type BsqlOp = "=" | ">=" | "<=" | ">" | "<";

export function _insert(tb: string, ignore?: boolean) {
    return new BsqlInsert(tb, ignore);
}

export function _query(tb: string) {
    return new BsqlQuery(tb);
}

export function _update(tb: string) {
    return new BsqlUpdate(tb);
}

export function _delete(tb: string) {
    return new BsqlDelete(tb);
}

export class BsqlInsert {
    private _columns: string[];
    private _values: any[][];
    private _updateOpt: { keeps?: string[], adds?: string[] };

    constructor(private _table: string, private _ignore?: boolean) {
    }

    /**
     * 通过一条数据构建（列名、数据）
     * @param data
     */
    public row(data: { [index: string]: any }) {
        return this.columns(Object.keys(data)).values(Object.values(data));
    }

    /**
     * 列名（字段）
     * @param fields
     */
    public columns(fields) {
        this._columns = QS(fields);
        return this;
    }

    /**
     * 数据
     * @param arr
     */
    public values(vals:any[]) {
        vals = Array.isArray(vals[0]) ? vals[0] : vals;
        if (vals.length != this._columns.length) {
            throw new Error("columns_not_match");
        }
        this._values = vals;
        return this;
    }

    /**
     * ON DUPLICATE KEY UPDATE
     * @param opt
     */
    public orUpdate(opt: { keeps?: string[], adds?: string[] }) {
        opt.keeps = (opt.keeps || EMPTY_ARR).map(QE);
        opt.adds = (opt.adds || EMPTY_ARR).map(QE);
        this._updateOpt = opt;
        return this;
    }

    public build() {
        if (!this._table || !this._columns || !this._values) {
            throw new Error("no_init");
        }
        let _pre_columns = this._columns.join(',');
        let _pre_pos = _ask(this._columns.length);
        let pre = this._ignore ? `INSERT IGNORE INTO ${QE(this._table)}(${_pre_columns})VALUES(${_pre_pos})` :
            `INSERT INTO ${QE(this._table)}(${_pre_columns})VALUES(${_pre_pos})`;
        if (!this._ignore && this._updateOpt) {
            let _ups = [];
            for (let c of this._columns) {
                if (this._updateOpt.keeps.includes(c)) {
                    continue;
                }
                if (this._updateOpt.adds.includes(c)) {
                    _ups.push(`${c}=${c}+VALUES(${c})`);
                } else {
                    _ups.push(`${c}=VALUES(${c})`);
                }
            }
            pre = `${pre}ON DUPLICATE KEY UPDATE ${_ups.join(',')}`;
        }
        return {sql: pre, values: this._values};
    }
}

class BsqlWhereBase {
    protected _wheres: string[];
    protected _whereValues: any[];

    constructor() {
        this._wheres = [];
        this._whereValues = [];
    }

    protected _pw(p: string) {
        if (this._wheres.length > 0) {
            this._wheres.push(`AND ${p}`);
        } else {
            this._wheres.push(p);
        }
        return this;
    }

    public where(colum: string, op: BsqlOp, val: any) {
        this._pw(`${QE(colum)}${op}?`)._whereValues.push(val);
        return this;
    }

    public whereEqual(colum: string, val: any) {
        return this.where(colum, "=", val);
    }

    public isNull(colum: string) {
        return this._pw(`${QE(colum)} IS NULL`);
    }

    public isNotNull(colum: string) {
        return this._pw(`${QE(colum)} IS NOT NULL`);
    }

    public or(colum1: string, op1: BsqlOp, val1: any, colum2: string, op2: BsqlOp, val2: any) {
        this._pw(`${QE(colum1)}${op1}? OR ${QE(colum2)}${op2}?`)._whereValues.push(val1, val2);
        return this;
    }

    public in(colum: string, vals: any[]) {
        this._pw(`${QE(colum)} IN(${_ask(vals.length)})`)._whereValues.push(...vals);
        return this;
    }

    public notIn(colum: string, vals: any[]) {
        this._pw(`${QE(colum)} NOT IN(${_ask(vals.length)})`)._whereValues.push(...vals);
        return this;
    }

    public inSubSql(colum: string, query: BsqlQuery) {
        let obj = query.build();
        this._pw(`${QE(colum)} IN(${obj.sql})`)._whereValues.push(...obj.values);
        return this;
    }

    // public notInSubSql(colum: string, query: BsqlQuery) {
    //     let obj = query.build();
    //     this._pw(`${QE(colum)} NOT IN(${obj.sql})`)._whereValues.push(...obj.values);
    //     return this;
    // }

    public between(colum: string, a: any, b: any) {
        this._pw(`${QE(colum)} BETWEEN ? AND ?`)._whereValues.push(a, b);
        return this;
    }

    public sqlNode(sqlPart: string, args?: any[]) {
        this._pw(sqlPart);
        args && args.length && this._whereValues.push(...args);
        return this;
    }

    public sqlWhere(_sql: string, _wheres: any[]) {
        this._wheres = [_sql];
        this._whereValues = _wheres;
        return this;
    }
}

export class BsqlDelete extends BsqlWhereBase {

    constructor(private _table: string) {
        super();
    }

    public build() {
        let pre = `DELETE FROM ${QE(this._table)}`;
        if (this._wheres.length) {
            pre = pre + ' WHERE ' + this._wheres.join(' ');
        }
        return {sql: pre, values: [...this._whereValues]};
    }
}

export class BsqlUpdate extends BsqlWhereBase {

    private _changes: string[];
    private _values: any[];

    private _sorts: string;
    private _limits: string;

    constructor(private _table: string) {
        super();
        this._changes = [];
        this._values = [];
    }

    public change(colum: string, math: BsqlMATH, val: any) {
        if (!math || math == '=') {
            this._changes.push(`${QE(colum)}=?`);
        } else {
            colum = QE(colum);
            this._changes.push(`${colum}=${colum}${math}?`);
        }
        this._values.push(val);
        return this;
    }

    public orderBy(colum: string | string[], sort: string) {
        if (Array.isArray(colum)) {
            this._sorts = ` ORDER BY ${QS(colum)} ${sort}`;
        } else {
            this._sorts = ` ORDER BY ${QE(colum)} ${sort}`
        }
        return this;
    }

    public desc(colum: string){
        return this.orderBy(colum, 'DESC');
    }

    public asc(colum: string){
        return this.orderBy(colum, 'ASC');
    }

    public limit(from: number, size: number = 0) {
        if (!size) {
            size = from;
            from = 0;
        }
        this._limits = ` LIMIT ${from},${size}`;
        return this;
    }

    public build() {
        let pre = `UPDATE ${QE(this._table)} SET ${this._changes.join(',')}`;
        if (this._wheres.length) {
            pre = pre + ' WHERE ' + this._wheres.join(' ');
        }
        if (this._sorts) {
            pre = pre + this._sorts;
        }
        if (this._limits) {
            pre = pre + this._limits;
        }
        return {sql: pre, values: [...this._values, ...this._whereValues]};
    }
}

export class BsqlQuery extends BsqlWhereBase {
    private _colums: string[];
    private _math: boolean;
    private _sorts: string;
    private _limits: string;

    constructor(private _table?: string) {
        super();
        this._colums = [];
    }

    public select(colums?: string[]) {
        this._colums = colums;
        return this;
    }

    public max(colum: string) {
        this._math = true;
        return this.select([`MAX(${QE(colum)})`]);
    }

    public min(colum: string) {
        this._math = true;
        return this.select([`MIN(${QE(colum)})`]);
    }

    public sum(colum: string) {
        this._math = true;
        return this.select([`SUM(${QE(colum)})`]);
    }

    public count(colum: string = "*") {
        this._math = true;
        return this.select([`COUNT(${QE(colum)})`]);
    }

    public countDistinct(colum: string) {
        this._math = true;
        return this.select([`COUNT(DISTINCT(${QE(colum)}))`]);
    }

    public orderBy(colum: string | string[], sort: string) {
        if (Array.isArray(colum)) {
            this._sorts = ` ORDER BY ${QS(colum)} ${sort}`;
        } else {
            this._sorts = ` ORDER BY ${QE(colum)} ${sort}`
        }
        return this;
    }

    public limit(from: number, size: number = 0) {
        if (!size) {
            size = from;
            from = 0;
        }
        this._limits = ` LIMIT ${from},${size}`;
        return this;
    }

    public build(has?: boolean) {
        let _cs = this._colums ? QS(this._colums).join(',') : '*';
        let pre = `SELECT ${_cs} FROM ${this._table}`;
        if (this._wheres.length) {
            pre = pre + ' WHERE ' + this._wheres.join(' ');
        }
        if (this._sorts) {
            pre = pre + this._sorts;
        }
        if (this._limits) {
            pre = pre + this._limits;
        }
        if (has) {
            pre = `SELECT EXISTS(${pre})`;
        }
        return {sql: pre, values: this._whereValues, math: this._math == true};
    }
}

const W_REG = /^\w+$/;
const EMPTY_ARR = [];
const ASK_ARR = [,'?','?,?','?,?,?','?,?,?,?','?,?,?,?,?','?,?,?,?,?,?','?,?,?,?,?,?,?','?,?,?,?,?,?,?,?','?,?,?,?,?,?,?,?,?']

function _ask(n:number){
    let s = ASK_ARR[n];
    if(!s){
        return new Array(n).fill('?').join(',');
    }
    return s;
}

function QE(k: string): string {
    return W_REG.test(k) ? "`" + k + "`" : k;
}

function QS(ks: string[]) {
    return ks.map(QE);
}