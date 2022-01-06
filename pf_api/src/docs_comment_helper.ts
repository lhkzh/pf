/**
 * Copyright 2019-2021 u14.com
 * MIT Licensed
 */
/**
 * 文件注释扫描并和方法对应
 * @link https://github.com/yavorskiy/comment-parser
 */
import fs = require("fs");

//获取-调用方法的文件
export function getCalledFile(curFile) {
    let stack = getCallerFileNameAndLine().stack.split("\n");
    let n = stack[stack.length - 1];
    if (n.indexOf('(') > 0) {
        n = n.substring(n.indexOf('(') + 1, n.indexOf('.js:') + 3);
    } else {
        n = n.substring(n.indexOf('at ') + 3, n.indexOf('.js:') + 3);
    }
    return n;
}
function getCallerFileNameAndLine() {
    try {
        throw Error('');
    } catch (err) {
        return err;
    }
}

//解析注释
export function parseComments(fileName) {
    return parse(fs.readTextFile(fileName), null);
}

//链接注释
export function linkFnComment(fileName) {
    let fileStr = fs.readTextFile(fileName);
    let fileLines = fileStr.split("\n").filter(e => {
        return e.trim().length > 0;
    });
    fileStr = fileLines.join("\n");
    let arr = parse(fileStr, null);
    if (arr.length > 1 && arr[arr.length - 1].source == arr[0].source) {
        arr.pop();
    }
    arr = arr.filter(e => {
        return e.tags.length > 0 && (e.source.includes("@api ") || e.source.includes("@state "));
    });
    // console.log(arr);return;
    let map = {}, defGroup = "all", defState = "unknow";
    arr.forEach((e, idx) => {
        let tagline = e.tags[e.tags.length - 1].line;
        let line;
        for (let i = 1; i < 5; i++) {
            line = fileLines[tagline + i].trim();
            if (idx == 0) {
                if (line.includes("class ")) {
                    break;
                }
            } else {
                if (line.startsWith("//") == false && line.trim().indexOf('*') < 0) {//!line.trim().startsWith("//")
                    break;
                }
            }
            line = null;
        }
        if (!line) {
            return;
        }
        // console.log(idx,"["+line+"]")
        if (line.includes("class ") || (line.includes('{') && line.includes('('))) {
            let is_class = false;
            if (line.includes("class ")) {
                is_class = true;
                line = line.substring(line.indexOf("class ") + 6).trim();
                line = line.substring(0, line.indexOf(' '));
            } else {
                line = line.substring(0, line.indexOf('(')).trim();
                if (line.indexOf(" ") > 0) {
                    line = line.substring(line.indexOf(" ")).trim();
                }
            }
            let groupRow = e.tags.find(t => t.tag == "api");
            let group = groupRow ? groupRow.name : null;
            let tags = e.tags.filter(t => {
                return t.tag != "api";
            });
            let params = [];
            let returns = [];
            let tpls = [];
            let state = defState;
            tags.forEach(t => {
                if (t.tag.includes("return")) {
                    if (!t.description) t.description = "";
                    returns.push({name: t.name, desc: t.description});
                } else if (t.tag.includes("param")) {
                    params[t.name] = t.description;
                } else if (t.tag.includes("examples") || t.tag.includes("tpl") || t.tag.includes("example")) {
                    tpls.push({name: t.name, desc: t.description});
                } else if (t.tag.includes("stat")) {
                    state = t.name;
                }
            });
            if (is_class) {
                defGroup = group || defGroup;
                map[line] = {
                    group: group || defGroup,
                    desc: e.description,
                    state: state
                };
            } else {
                map[line] = {
                    group: group || defGroup,
                    desc: e.description,
                    state: state,
                    params: params,
                    returns: returns,
                    tpls: tpls
                };
            }
        }
    });
    return map;
}


function skipws(str) {
    let i = 0
    do {
        if (str[i] !== ' ' && str[i] !== '\t') {
            return i
        }
    } while (++i < str.length)
    return i
}

/* ------- default parsers ------- */

const PARSERS = {
    parse_tag: (str) => {
        const result = str.match(/^\s*@(\S+)/)
        if (!result) {
            throw new Error('Invalid `@tag`, missing @ symbol')
        }
        return {
            source: result[0],
            data: {tag: result[1]}
        }
    },
    parse_type: (str, data) => {
        if (data.errors && data.errors.length) {
            return null
        }
        let pos = skipws(str)
        let res = ''
        let curlies = 0
        if (str[pos] !== '{') {
            return null
        }
        while (pos < str.length) {
            curlies += (str[pos] === '{' ? 1 : (str[pos] === '}' ? -1 : 0))
            res += str[pos]
            pos++
            if (curlies === 0) {
                break
            }
        }
        if (curlies !== 0) {
            throw new Error('Invalid `{type}`, unpaired curlies')
        }
        return {
            source: str.slice(0, pos),
            data: {type: res.slice(1, -1)}
        }
    },
    parse_name: (str, data) => {
        if (data.errors && data.errors.length) {
            return null
        }
        let pos = skipws(str)
        let name = ''
        let brackets = 0
        let res: any = {optional: false}

        // if it starts with quoted group assume it is a literal
        const quotedGroups = str.slice(pos).split('"')
        if (quotedGroups.length > 1 && quotedGroups[0] === '' && quotedGroups.length % 2 === 1) {
            name = quotedGroups[1]
            pos += name.length + 2
            // assume name is non-space string or anything wrapped into brackets
        } else {
            while (pos < str.length) {
                brackets += (str[pos] === '[' ? 1 : (str[pos] === ']' ? -1 : 0))
                name += str[pos]
                pos++
                if (brackets === 0 && /\s/.test(str[pos])) {
                    break
                }
            }
            if (brackets !== 0) {
                throw new Error('Invalid `name`, unpaired brackets')
            }
            res = {name: name, optional: false}
            if (name[0] === '[' && name[name.length - 1] === ']') {
                res.optional = true
                name = name.slice(1, -1)

                if (name.indexOf('=') !== -1) {
                    const parts = name.split('=')
                    name = parts[0]
                    res.default = parts[1].replace(/^(["'])(.+)(\1)$/, '$2')
                }
            }
        }
        res.name = name
        return {
            source: str.slice(0, pos),
            data: res
        }
    },
    parse_description: (str, data) => {
        if (data.errors && data.errors.length) {
            return null
        }
        const result = str.match(/^\s+((.|\s)+)?/)
        if (result) {
            return {
                source: result[0],
                data: {description: result[1] === undefined ? '' : result[1]}
            }
        }
        return null
    }
}
const MARKER_START = '/**'
const MARKER_START_SKIP = '/***'
const MARKER_END = '*/'

/* ------- util functions ------- */

function find(list, filter) {
    let i = list.length
    let matchs = true

    while (i--) {
        for (const k in filter) {
            if ({}.hasOwnProperty.call(filter, k)) {
                matchs = (filter[k] === list[i][k]) && matchs
            }
        }
        if (matchs) {
            return list[i]
        }
    }
    return null
}

/* ------- parsing ------- */

/**
 * Parses "@tag {type} name description"
 * @param {string} str Raw doc string
 * @param {Array<function>} parsers Array of parsers to be applied to the source
 * @returns {object} parsed tag node
 */
function parse_tag(str, parsers) {
    if (typeof str !== 'string' || str[0] !== '@') {
        return null
    }

    const data = parsers.reduce(function (state, parser) {
        let result

        try {
            result = parser(state.source, Object.assign({}, state.data))
        } catch (err) {
            state.data.errors = (state.data.errors || [])
                .concat(parser.name + ': ' + err.message)
        }

        if (result) {
            state.source = state.source.slice(result.source.length)
            state.data = Object.assign(state.data, result.data)
        }

        return state
    }, {
        source: str,
        data: {}
    }).data

    data.optional = !!data.optional
    data.type = data.type === undefined ? '' : data.type
    data.name = data.name === undefined ? '' : data.name
    data.description = data.description === undefined ? '' : data.description

    return data
}

/**
 * Parses comment block (array of String lines)
 */
function parse_block(source, opts) {
    const trim = opts.trim
        ? function trim(s) {
            return s.trim()
        }
        : function trim(s) {
            return s
        }

    let source_str = source
        .map((line) => {
            return trim(line.source)
        })
        .join('\n')

    source_str = trim(source_str)

    const start = source[0].number

    // merge source lines into tags
    // we assume tag starts with "@"
    source = source
        .reduce(function (tags, line) {
            line.source = trim(line.source)

            if (line.source.match(/^\s*@(\S+)/)) {
                tags.push({
                    source: [line.source],
                    line: line.number
                })
            } else {
                const tag = tags[tags.length - 1]
                if (opts.join !== undefined && opts.join !== false && opts.join !== 0 &&
                    !line.startWithStar && tag.source.length > 0) {
                    let source
                    if (typeof opts.join === 'string') {
                        source = opts.join + line.source.replace(/^\s+/, '')
                    } else if (typeof opts.join === 'number') {
                        source = line.source
                    } else {
                        source = ' ' + line.source.replace(/^\s+/, '')
                    }
                    tag.source[tag.source.length - 1] += source
                } else {
                    tag.source.push(line.source)
                }
            }

            return tags
        }, [{source: []}])
        .map((tag) => {
            tag.source = trim(tag.source.join('\n'))
            return tag
        })

    // Block description
    const description = source.shift()

    // skip if no descriptions and no tags
    if (description.source === '' && source.length === 0) {
        return null
    }

    const tags = source.reduce(function (tags, tag) {
        const tag_node = parse_tag(tag.source, opts.parsers)

        if (!tag_node) {
            return tags
        }

        tag_node.line = tag.line
        tag_node.source = tag.source

        if (opts.dotted_names && tag_node.name.includes('.')) {
            let parent_name
            let parent_tag
            let parent_tags = tags
            const parts = tag_node.name.split('.')

            while (parts.length > 1) {
                parent_name = parts.shift()
                parent_tag = find(parent_tags, {
                    tag: tag_node.tag,
                    name: parent_name
                })

                if (!parent_tag) {
                    parent_tag = {
                        tag: tag_node.tag,
                        line: Number(tag_node.line),
                        name: parent_name,
                        type: '',
                        description: ''
                    }
                    parent_tags.push(parent_tag)
                }

                parent_tag.tags = parent_tag.tags || []
                parent_tags = parent_tag.tags
            }

            tag_node.name = parts[0]
            parent_tags.push(tag_node)
            return tags
        }

        return tags.concat(tag_node)
    }, [])

    return {
        tags,
        line: start,
        description: description.source,
        source: source_str
    }
}

/**
 * Produces `extract` function with internal state initialized
 */
function mkextract(opts) {
    let chunk = null
    let indent = 0
    let number = 0

    opts = Object.assign({}, {
        trim: true,
        dotted_names: false,
        parsers: [
            PARSERS.parse_tag,
            PARSERS.parse_type,
            PARSERS.parse_name,
            PARSERS.parse_description
        ]
    }, opts || {})

    /**
     * Read lines until they make a block
     * Return parsed block once fullfilled or null otherwise
     */
    return function extract(line) {
        let result = null
        const startPos = line.indexOf(MARKER_START)
        const endPos = line.indexOf(MARKER_END)

        // if open marker detected and it's not, skip one
        if (startPos !== -1 && line.indexOf(MARKER_START_SKIP) !== startPos) {
            chunk = []
            indent = startPos + MARKER_START.length
        }
        // if we are on middle of comment block
        if (chunk) {
            let lineStart = indent
            let startWithStar = false
            // figure out if we slice from opening marker pos
            // or line start is shifted to the left
            const nonSpaceChar = line.match(/\S/)
            // skip for the first line starting with /** (fresh chunk)
            // it always has the right indentation
            if (chunk.length > 0 && nonSpaceChar) {
                if (nonSpaceChar[0] === '*') {
                    lineStart = nonSpaceChar.index + 2
                    startWithStar = true
                } else if (nonSpaceChar.index < indent) {
                    lineStart = nonSpaceChar.index
                }
            }
            // slice the line until end or until closing marker start
            chunk.push({
                number,
                startWithStar,
                source: line.slice(lineStart, endPos === -1 ? line.length : endPos)
            })

            // finalize block if end marker detected
            if (endPos !== -1) {
                result = parse_block(chunk, opts)
                chunk = null
                indent = 0
            }
        }
        number += 1
        return result
    }
}

/* ------- Public API ------- */

function parse(source, opts) {
    const blocks = []
    const extract = mkextract(opts)
    const lines = source.split(/\n/)

    lines.forEach((line) => {
        const block = extract(line)
        if (block) {
            blocks.push(block)
        }
    })

    return blocks
}