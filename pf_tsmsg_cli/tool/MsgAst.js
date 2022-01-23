const os = require("os");
const fs = require("fs");
const path = require("path");
let path_arr = ["typescript", path.join(os.homedir(), "AppData/Roaming/npm/node_modules/typescript")];
if (fs.existsSync(os.homedir() + "/.npmrc")) {
    fs.readFileSync(os.homedir() + "/.npmrc", "utf8").split("\n").some(e => {
        if (e.startsWith("prefix") || e.startsWith("cache")) {
            let global_dir = e.split("=")[1];
            if (global_dir && global_dir.length > 0) {
                path_arr.push(global_dir.trim() + "/node_modules/typescript");
            }
        }
    });
}
let ts;
for (var i = 0; i < path_arr.length; i++) {
    try {
        ts = require(path_arr[i]);
        break;
    }
    catch (e) {
        if (i == path_arr.length - 1) {
            throw new Error("typescript not found");
        }
    }
}
class MsgAst {
    static parse(source) {
        let output = {};
        // 1. get flatten nodes
        let src = ts.createSourceFile('', source, ts.ScriptTarget.ES3, true, ts.ScriptKind.TS);
        let sid = 0;
        let sidFn = () => {
            return ++sid;
        };
        let info = this.getLinkDict(source, src, sidFn);
        let msgs = info.dict;
        for (var classType in msgs) {
            var classNode = msgs[classType];
            var classMembers = this.parseFields(classType, classNode.type);
            msgs[classType] = {
                id: classNode.id,
                members: classMembers
            };
        }
        return { ...info.link, ...info.dict };
    }
    static parseFields(srcType, node) {
        // 去除外层括弧
        while (ts.isParenthesizedTypeNode(node)) {
            node = node.type;
        }
        // AnyType
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
            throw new Error("bad type:" + srcType);
        }
        //ts.isTypeReferenceNode(node)
        var v_fields = [];
        node.members.forEach((member, i) => {
            if (ts.isPropertySignature(member)) {
                if (ts.isComputedPropertyName(member.name) || !member.type || this.isBadType(member.type)) {
                    throw new Error(`bad type: ${srcType}` + member.getText());
                }
                var fieldName = member.name.text, optional = member.questionToken;
                var fieldType = this.getTypeName(member, srcType);
                v_fields.push([fieldName, fieldType, optional ? 1 : 0]);
            }
            else if (ts.isIndexSignatureDeclaration(member)) {
                if (!member.type || !member.parameters[0].type) {
                    throw new Error(`bad type: ${srcType}-` + member.getText());
                }
                let keyType;
                if (member.parameters[0].type.kind === ts.SyntaxKind.NumberKeyword) {
                    keyType = 'number';
                }
                else {
                    keyType = 'string';
                }
                let valType = this.getTypeName(member, srcType);
                v_fields.push([keyType, valType, 2]);
            }
            else {
                throw new Error(`bad type: ${srcType}` + member.getText());
            }
        });
        return v_fields;
    }
    static getTypeName(member, srcType) {
        if ((member.name && ts.isComputedPropertyName(member.name)) || (member.type && this.isBadType(member.type))) {
            throw new Error(`bad type: ${srcType}`);
        }
        var fieldType;
        if (member.type.kind === ts.SyntaxKind.StringKeyword) {
            fieldType = "string";
        }
        else if (member.type.kind === ts.SyntaxKind.NumberKeyword) {
            fieldType = "number";
        }
        else if (member.type.kind === ts.SyntaxKind.BooleanKeyword) {
            fieldType = "boolean";
        }
        else if (member.type.kind === ts.SyntaxKind.ArrayType) {
            // if(member.typeArguments){
            //     fieldType = this.getTypeName(member.typeArguments[0], srcType);
            // }
            // var tmp = member.type.getText().replace(/\s/g,"");
            // tmp = tmp.replace("[", "").replace("]","").trim();
            // if(!/^\w*$/.test(tmp)){
            //     throw new Error("bad type:"+srcType)
            // }
            // fieldType = tmp+"[]";
            fieldType = member.type.elementType.getText().replace(/\s/g, "") + "[]";
        }
        else {
            // if (ts.isPropertySignature(member)) {
            //     return this.getTypeName(member.type, srcType);
            // }
            if (ts.isTypeReferenceNode(member.type)) {
                fieldType = member.type.getText();
                if (member.type.typeArguments) {
                    if (member.type.typeArguments.length == 1) {
                        if (fieldType.includes("Array<")) {
                            fieldType = member.type.typeArguments[0].getText().replace(/\s/g, "") + "[]";
                            // fieldType = fieldType.substr(fieldType.indexOf('<'))
                            //     .replace('>','')+"[]";
                        }
                    }
                }
            }
            else if (ts.isTypeLiteralNode(member.type)) {
                // console.warn("++",member.type.members.length,member.type.members[0].kind);
                fieldType = this.parseFields(srcType, member.type);
            }
            else {
                fieldType = member.getText();
            }
        }
        return fieldType;
    }
    static isBadType(v) {
        if (v.kind === ts.SyntaxKind.AnyKeyword || (v.kind === ts.SyntaxKind.TypeAliasDeclaration && v.type.kind == ts.SyntaxKind.AnyKeyword)) {
            return true;
        }
        if (v.kind === ts.SyntaxKind.ObjectKeyword) {
            return true;
        }
        if (v.kind === ts.SyntaxKind.ArrayType) {
            if (v.typeArguments) {
                return this.isBadType(v.typeArguments[0]);
            }
        }
        if (ts.isArrayTypeNode(v)) {
            return this.isBadType(v.elementType);
        }
        return false;
    }
    /**
     * 将Node展平（包括Namespace里的）
     * @param node
     * @param isExport 当node是Namespace时，其外层是否处于export
     */
    static getLinkDict(source, node, sidFn) {
        let link = {};
        let output = {};
        let limit = {};
        node.forEachChild(v => {
            if (this.isBadType(v)) {
                throw new Error("bad type:" + v.name.text);
            }
            if (v.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                // if(v.type.kind==ts.SyntaxKind.NumberKeyword || v.type.kind === ts.SyntaxKind.BooleanKeyword){
                // }
                var str = v.type.getText();
                if (/\W/.test(str)) {
                    // ts.isTypeLiteralNode(v)
                    if (v.type.typeArguments && v.type.typeArguments.length == 1 && v.type.getText().includes("Array<")) {
                        link[v.name.text] = v.type.typeArguments[0].getText().replace(/\s/g, "") + "[]";
                    }
                    else if (v.type.kind === ts.SyntaxKind.ArrayType) {
                        link[v.name.text] = v.type.elementType.getText().replace(/\s/g, "") + "[]";
                    }
                    else {
                        output[v.name.text] = { id: sidFn(), type: v.type };
                    }
                }
                else {
                    link[v.name.text] = str;
                }
            }
            else if (ts.isInterfaceDeclaration(v)) {
                output[v.name.text] = { id: sidFn(), type: v };
            }
            else if (ts.isEnumDeclaration(v) && v.members.length > 0) {
                let enumInfo = this.getEnumInfo(v);
                link[v.name.text] = enumInfo.type;
                limit[v.name.text] = enumInfo.members;
            }
            else if (ts.isModuleDeclaration(v) && (v.flags & ts.NodeFlags.Namespace)) {
                if (v.body && v.body.kind === ts.SyntaxKind.ModuleBlock) {
                    // 递归生成子树
                    let children = this.getLinkDict(source, v.body, sidFn);
                    let subLink = children.link;
                    let subDict = children.dict;
                    let subLimit = children.limit;
                    for (let tmp in subDict) {
                        output[v.name.text + '.' + tmp] = subDict[tmp];
                    }
                    for (var tmp in subLimit) {
                        link[v.name.text + '.' + tmp] = subLimit[tmp];
                    }
                }
            }
        });
        return {
            link: link,
            dict: output,
            limit: limit
        };
    }
    static getEnumInfo(v) {
        // 要么全是正数， 要么全是字符串
        var str = false, num = false, fnum = false, min = 0;
        var initializer = 0, vals = [];
        v.members.forEach(e => {
            if (e.initializer) {
                if (ts.isNumericLiteral(e.initializer)) {
                    if (str) {
                        throw new Error("bad type:" + v.name.text);
                    }
                    initializer = parseFloat(e.initializer.text);
                    vals.push(initializer);
                    initializer++;
                    num = true;
                }
                else if (ts.isStringLiteral(e.initializer)) {
                    if (num) {
                        throw new Error("bad type:" + v.name.text);
                    }
                    initializer = NaN;
                    str = true;
                    vals.push(e.initializer.text);
                }
                else if (ts.isPrefixUnaryExpression(e.initializer) && e.initializer.operator === ts.SyntaxKind.MinusToken) {
                    if (str) {
                        throw new Error("bad type:" + v.name.text);
                    }
                    initializer = parseFloat(e.initializer.operand.getText()) * -1;
                    min = Math.min(min, initializer);
                    vals.push(initializer);
                    initializer++;
                    num = true;
                    fnum = true;
                }
                else {
                    throw new Error("bad type:" + v.name.text);
                }
            }
            else {
                if (str) {
                    throw new Error("bad type:" + v.name.text);
                }
                vals.push(initializer);
                initializer++;
                num = true;
            }
        });
        let type;
        if (str) {
            type = "string";
        }
        else {
            type = "int";
            if (min >= 0) {
                if (initializer < 0xff) {
                    type = "uint8";
                }
                else if (initializer < 0xffff) {
                    type = "uint16";
                }
            }
        }
        return { type: type, members: vals };
    }
}
exports.MsgAst = MsgAst;

