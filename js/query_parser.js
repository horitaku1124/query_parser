const TYPE_NONE = 0,
    TYPE_COLUMN = 1,
    TYPE_FROM = 2,
    TYPE_WHERE = 3,
    TYPE_VALUES = 4;

const NODE_TYPE_SELECT = 1,
    NODE_TYPE_UPDATE = 2,
    NODE_TYPE_INSERT = 3,
    NODE_TYPE_DELETE = 4;

const NODE_VALUE = 1,
    NODE_CHILD_TYPE_COLUMN = 1001,
    NODE_CHILD_TYPE_FROM = 1002,
    NODE_CHILD_TYPE_WHERE = 1003,
    NODE_CHILD_TYPE_VALUES = 1004,
    NODE_CHILD_TYPE_INTO = 1005;

class Node {
    constructor(type, value) {
        this._type = type;
        this._value = value;
    }

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
    if(node.type == NODE_CHILD_TYPE_VALUES) {
        console.log("NODE_VALUES");
    }
    if(node.type == NODE_CHILD_TYPE_INTO) {
        console.log("NODE_INTO");
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

function fromToDataSource(dataScope, froms) {
    console.log("froms", froms);

    var baseTable = [];
    if(froms.length > 0) {
        baseTable = dataScope[froms[0]];
    }
    console.log("baseTable", baseTable);

    for(let i = 1;i < froms.length;i++) {
        var next = froms[i];
        var next2 = froms[i + 1];
        if(next == "JOIN") {
            next = "LEFT";
            next2 = "JOIN";
        }
        i += 2;
        if(next == "INNER" && next2 == "JOIN") {
            var newBaseTable = [];
            var joinTable = dataScope[froms[i]];
            var joinOn = froms[i + 1] == "ON";
            var joinLeft = joinOn ? froms[i + 2] : null,
                joinExpression = joinOn ? froms[i + 3] : null,
                joinRight = joinOn ? froms[i + 4] : null;
            for(let j = 0;j < baseTable.length;j++) {
                for(let k = 0;k < joinTable.length;k++) {
                    if (joinOn) {
                        var left = baseTable[j][joinLeft], right = joinTable[k][joinRight];
                        var result = false;
                        switch(joinExpression) {
                            case "=":
                                result = left == right;
                                break;
                        }
                        if(!result) continue;
                    }
                    var newRow = {};
                    Object.assign(newRow, baseTable[j]);
                    Object.assign(newRow, joinTable[k]);
                    var leftValue = 
                    newBaseTable.push(newRow);
                }
            }
            baseTable = newBaseTable;
        }
    }
    console.log("baseTable", baseTable);

    return baseTable;
}

function filterByWhere(dataSource, wheres, selectors) {
    var resultSource = [];
    for(let i = 0;i < dataSource.length;i++) {
        var row = dataSource[i];
        var resultRow = [];
        for(let j = 0;j < wheres.length;j += 2) {
            var subject = row[wheres[j][0]];
            var expression = wheres[j][1];
            var object = wheres[j][2];
            var result = false;
            switch (expression) {
                case "<>":
                    result = subject != object;
                    break;
                case "=":
                    result = subject == object;
                    break;
                case ">":
                    result = subject > object;
                    break;
                case "<":
                    result = subject < object;
                    break;
            }
            resultRow.push(result);

            if(wheres[j + 1]) {
                resultRow.push(wheres[j + 1].toUpperCase());
            }
        }
        while(resultRow.length > 2) {
            var newRow = [];
            var left = resultRow[0], right = resultRow[2];
            var expression = resultRow[1];

            var result = false;
            switch (expression) {
                case "AND":
                    result = left && right;
                    break;
                case "OR":
                    result = left || right;
                    break;
            }
            newRow.push(result);
            for(let j = 3;j < resultRow.length;j++) {
                newRow.push(resultRow[j]);
            }
            resultRow = newRow;
        }
        if(resultRow.length == 1) {
            if(resultRow[0]) {
                var newRow = {};
                for(var key of selectors) {
                    if(key == "*") {
                        for(var key2 in row) {
                            newRow[key2] = row[key2];
                        }
                    } else {
                        newRow[key] = row[key];
                    }
                }
                resultSource.push(newRow);
            }
        }
    }
    return resultSource;
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
        if(type == TYPE_VALUES) {
            queryTokens.values.push(verse);
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

        if(root.type == NODE_TYPE_SELECT || root.type == NODE_TYPE_INSERT){
            var columnNode = new Node(NODE_CHILD_TYPE_COLUMN);

            if(root.type == NODE_TYPE_INSERT) {
                var into = queryTokens.columns[0].toLowerCase();
                if(into != "into") {
                    throw Error('INSERT "INTO" error');
                }

                let node = new Node(NODE_CHILD_TYPE_INTO, queryTokens.columns[1]);
                root.addChild(node);
            }

            for(let i = 2;i < queryTokens.columns.length;i++) {
                let column = queryTokens.columns[i];
                if(column != "," && column != "("  && column != ")") {
                    let node = new Node(NODE_VALUE, column);
                    columnNode.addChild(node);
                }
            }
            root.addChild(columnNode);
        }
        if(root.type == NODE_TYPE_SELECT || root.type == NODE_TYPE_UPDATE ||  root.type == NODE_TYPE_DELETE){
            var fromNode = new Node(NODE_CHILD_TYPE_FROM);

            for(let i = 0;i < queryTokens.froms.length;i++) {
                let column = queryTokens.froms[i];
                if(column != ",") {
                    let node = new Node(NODE_VALUE, column);
                    fromNode.addChild(node);
                }
            }
            root.addChild(fromNode);
        }
        if(root.type == NODE_TYPE_SELECT || root.type == NODE_TYPE_UPDATE ||  root.type == NODE_TYPE_DELETE){
            var whereNode = new Node(NODE_CHILD_TYPE_WHERE);

            var length = queryTokens.wheres.length;
            for(let i = 0;i < length;i++) {
                let column = queryTokens.wheres[i];

                if(column == ",") {
                    continue;
                }
                if(column == "AND") {
                    let node = new Node(NODE_VALUE, "AND");
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
                let node = new Node(NODE_VALUE, formulas);
                whereNode.addChild(node);
            }
            root.addChild(whereNode);
        }
        if(root.type == NODE_TYPE_INSERT){
            var valuesNode = new Node(NODE_CHILD_TYPE_VALUES);

            for(let i = 0;i < queryTokens.values.length;i++) {
                let column = queryTokens.values[i];
                if(column != "," && column != "("  && column != ")") {
                    let node = new Node(NODE_VALUE, column);
                    valuesNode.addChild(node);
                }
            }
            root.addChild(valuesNode);
        }
        return root;
    }

    convert(sql)
    {
        var queryTokens = {
            columns: [],
            froms: [],
            wheres: [],
            values: [],
            into: null
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
                if(verse2 == "select" || verse2 == "insert") {
                    type = TYPE_COLUMN;
                    queryType = verse2;
                    queryTypeDecided = true;
                } else if(verse2 == "from") {
                    type = TYPE_FROM;
                } else if(verse2 == "where") {
                    type = TYPE_WHERE;
                } else if(verse2 == "values") {
                    type = TYPE_VALUES;
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
        console.log("queryTokens.values=", queryTokens.values);

        var syntaxTree = QueryParser.makeSyntaxTree(queryType, queryTokens);
        console.log("makeSyntaxTree", syntaxTree);

        console.group();
        printSyntaxTree(syntaxTree);
        console.groupEnd();

        var selectors = [], froms = [], wheres = [], values = [];
        for(let i = 0;i < syntaxTree.children.length;i++) {
            let node = syntaxTree.children[i];
            if(node.type == NODE_CHILD_TYPE_COLUMN) {
                for(let child of node.children) {
                    selectors.push(child.value);
                }
            }
            if(node.type == NODE_CHILD_TYPE_FROM) {
                for(let child of node.children) {
                    froms.push(child.value);
                }
            }
            if(node.type == NODE_CHILD_TYPE_WHERE) {
                for(let child of node.children) {
                    wheres.push(child.value);
                }
            }
            if(node.type == NODE_CHILD_TYPE_VALUES) {
                for(let child of node.children) {
                    values.push(child.value);
                }
            }
        }
        var parseResult = {type: queryType};
        if(queryType == "select" || queryType == "update" || queryType == "delete") {
            let dataSource = fromToDataSource(this._global, froms);
            console.log(dataSource);
            dataSource = filterByWhere(dataSource, wheres, selectors);
            parseResult["dataSource"] = dataSource;
            return parseResult;   
        }
        if(queryType == "insert") {
            parseResult["selectors"] = selectors;
            parseResult["values"] = values;
            return parseResult;   
        }
    }
}