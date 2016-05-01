const TYPE_NONE = 0,
    TYPE_COLUMN = 1,
    TYPE_FROM = 2,
    TYPE_WHERE = 3;

const NODE_TYPE_SELECT = 1,
    NODE_TYPE_UPDATE = 2,
    NODE_TYPE_INSERT = 3,
    NODE_TYPE_DELETE = 4;

const NODE_CHILD_TYPE_COLUMN = 1001,
    NODE_CHILD_TYPE_FROM = 1002,
    NODE_CHILD_TYPE_WHERE = 1003;

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

    addChild(node) {
        if(typeof this._children == 'undefined') {
            this._children = [];
        }
        this._children.push(node);
    }
}

function printSyntaxTree(node, indent = 0) {
    let indentSpace = new Array(indent).join(" ");
    if(node.type == NODE_CHILD_TYPE_COLUMN) {
        console.log("NODE_COLUMN");
    }
    if(node.type == NODE_CHILD_TYPE_FROM) {
        console.log("NODE_FROM");
    }
    if(node.type == NODE_CHILD_TYPE_WHERE) {
        console.log("NODE_WHERE");
    }
    if(node.value) {
        console.log(indentSpace + node.value)
    }
    if(node.children) {
        for(let child of node.children) {
            printSyntaxTree(child, indent + 2);
        }
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
            if(/^and$/i.test(verse)) {
                verse = verse.toUpperCase();
            }
            queryTokens.wheres.push(verse);
        }
        console.log(verse);
    }

    static makeSyntaxTree(queryType, queryTokens)
    {
        var root = new Node();
        switch (queryType) {
            case "select":
                root.type = NODE_TYPE_SELECT;
                break;
            case "update":
                root.type = NODE_TYPE_UPDATE;
                break;
            case "insert":
                root.type = NODE_TYPE_INSERT;
                break;
            case "delete":
                root.type = NODE_TYPE_DELETE;
                break;
            default:
                throw Error("error");
                break;
        }

        {
            var columnNode = new Node();
            columnNode.type = NODE_CHILD_TYPE_COLUMN;

            for(let i = 0;i < queryTokens.columns.length;i++) {
                let column = queryTokens.columns[i];
                if(column != ",") {
                    let node = new Node();
                    node.value = column;
                    columnNode.addChild(node);
                }
            }
            root.addChild(columnNode);
        }
        {
            var fromNode = new Node();
            fromNode.type = NODE_CHILD_TYPE_FROM;

            for(let i = 0;i < queryTokens.froms.length;i++) {
                let column = queryTokens.froms[i];
                if(column != ",") {
                    let node = new Node();
                    node.value = column;
                    fromNode.addChild(node);
                }
            }
            root.addChild(fromNode);
        }
        {
            var whereNode = new Node();
            whereNode.type = NODE_CHILD_TYPE_WHERE;

            var length = queryTokens.wheres.length;
            for(let i = 0;i < length;i++) {
                let column = queryTokens.wheres[i];

                if(column == ",") {
                    continue;
                }
                if(column == "AND") {
                    let node = new Node();
                    node.value = "AND";
                    whereNode.addChild(node);
                    continue;
                }
                var formulas = [column];
                for(let j = 0;j < 2;j++) {
                    if((i + 2 <= length) &&  queryTokens.wheres[i + 1] != "and") {
                        formulas.push(queryTokens.wheres[i + 1]);
                        i++;
                    } else {
                        break;
                    }
                }
                let node = new Node();
                node.value = formulas;
                whereNode.addChild(node);
            }
            root.addChild(whereNode);
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

        var syntaxTree = QueryParser.makeSyntaxTree(queryType, queryTokens);
        console.log("makeSyntaxTree", syntaxTree);

        console.group();
        console.log("data", data);

        var keyToColumn = {};

        for(let i in data) {
            var keys = Object.keys(data[i][0]);
            var columnNodes = syntaxTree.children[0];
            for(let columnNode of columnNodes.children) {
                var column = columnNode.value;
                let index = keys.indexOf(column);
                if(index >= 0) {
                    keys.indexOf(column);
                    keyToColumn[column] = [i, column];
                }
            }
        }
        console.log("keyToColumn", keyToColumn);
        console.group();
        printSyntaxTree(syntaxTree);
        console.groupEnd();
        console.groupEnd();
    }
}