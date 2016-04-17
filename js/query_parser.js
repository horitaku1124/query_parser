const TYPE_NONE = 0,
    TYPE_COLUMN = 1,
    TYPE_FROM = 2,
    TYPE_WHERE = 3;

const NODE_TYPE_SELECT = 1,
    NODE_TYPE_UPDATE = 2;
class Node {
    get type() {
        return this._type;
    }
    set type(type) {
        this._type = type;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    get children() {
        return this._children;
    }
    set children(children) {
        this._children = children;
    }
}

class QueryParser {
    constructor(global)
    {
        this._global = global;
    }
    static exeVerse(type, queryTokens, verse) {
        if(type == TYPE_COLUMN) {
            queryTokens.columns.push(verse);
        }
        if(type == TYPE_FROM) {
            queryTokens.froms.push(verse);
        }
        if(type == TYPE_WHERE) {
            queryTokens.wheres.push(verse);
        }
        console.log(verse);
    }

    makeSyntaxTree(queryType, queryTokens)
    {
        var root = new Node();
        switch (queryType) {
            case "select":
                root.type = NODE_TYPE_SELECT;
                break;
            case "update":
                root.type = NODE_TYPE_UPDATE;
                break;
            case "inser":
                root.type = NODE_TYPE_INSERT;
                break;
            case "delete":
                root.type = NODE_TYPE_DELETE;
                break;
            default:
                throw Error("error");
                break;
        }
        return root;
    }

    convert(sql)
    {
        var queryTokens = {
            columns: [],
            froms: [],
            wheres: []
        };

        var verse = "";
        var queryTypeDecided = false;
        var queryType;
        var type = TYPE_NONE;
        console.group();
        var quote = null;
        for(let i = 0;i < sql.length;i++) {
            const char = sql[i];
            if(quote != null) {
                if(char == quote) {
                    quote = null;
                    QueryParser.exeVerse(type, queryTokens, verse);
                    verse = "";
                } else {
                    verse += char;
                }
                continue;
            }
            if(char === '\'' || char === '"' || char === '`') {
                quote = char;
            } else if(char === ' ' || char === '\t' || char === '\r' || char === '\n') {
                var verse2 = verse.toLowerCase();
                if(verse2 == "select") {
                    type = TYPE_COLUMN;
                    queryType = verse2;
                    queryTypeDecided = true;
                } else if(verse2 == "from") {
                    type = TYPE_FROM;
                } else if(verse2 == "where") {
                    type = TYPE_WHERE;
                } else {
                    if(verse != "") {
                        QueryParser.exeVerse(type, queryTokens, verse);
                    }
                }
                verse = "";
            } else if(char === ',' || char === '(' || char === ')') {
                if(verse != "") {
                    QueryParser.exeVerse(type, queryTokens, verse);
                }
                QueryParser.exeVerse(type, queryTokens, char);
                verse = "";
            } else {
                verse += char;
            }
        }
        if(verse != "") {
            QueryParser.exeVerse(type, queryTokens, verse);
        }
        console.groupEnd();
        console.log("QueryType=", queryType);
        console.log("queryTokens.columns=", queryTokens.columns);
        console.log("queryTokens.froms=", queryTokens.froms);
        console.log("queryTokens.wheres=", queryTokens.wheres);

        var data = {};
        for(let from of queryTokens.froms) {
            data[from] = this._global[from];
        }
        console.log("makeSyntaxTree", this.makeSyntaxTree(queryType, queryTokens));

/*
        console.group();
        console.log("data", data);

        var keyToColumn = {};

        for(let i in data) {
            var keys = Object.keys(data[i][0]);
            for(let column of queryTokens.columns) {
                let index = keys.indexOf(column);
                if(index >= 0) {
                    keys.indexOf(column);
                    keyToColumn[column] = [i, column];
                }
            }
        }
        console.log("keyToColumn", keyToColumn);

        for(let from of queryTokens.froms) {
            let target = data[from];
            for(let i = 0;i < target.length;i++) {
                let row = target[i];

                let index = 0;
                let rowIsMatched = true;
                while(index < queryTokens.wheres.length) {
                    let left = queryTokens.wheres[index];
                    let operation = queryTokens.wheres[index + 1];
                    let right = queryTokens.wheres[index + 2];
                    if(operation == "=") {
                        if(row[left] != right) {
                            rowIsMatched = false;
                            break;
                        }
                    }

                    index += 3;
                }
                if(!rowIsMatched) {
                    continue;
                }

                let record = [];
                for(let column of queryTokens.columns) {
                    record.push(row[column]);
                }
                console.log(record);
            }
        }

        console.groupEnd();
        */
    }
}