
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
                if(/[a-zA-Z0-9\_]+/.test(column)) {
                    let next = queryTokens.values[i + 1] != undefined ? queryTokens.values[i + 1] : null;
                    let next2 = queryTokens.values[i + 2] != undefined ? queryTokens.values[i + 2] : null;
                    if(next == "(" && next2 == ")") {
                        let node = new Node(NODE_VALUE, column + next + next2);
                        valuesNode.addChild(node);
                        i += 2;
                        continue;
                    }
                }
                if(column != "," && column != "("  && column != ")") {
                    let node = new Node(NODE_VALUE, column);
                    valuesNode.addChild(node);
                }
            }
            root.addChild(valuesNode);
            if(root.children[1].children.length != root.children[2].children.length) {
                throw new Error("length error");
            }
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

        var verse = "", quote = null, queryType;
        var queryTypeDecided = false;
        var type = TYPE_NONE;
        console.group();
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

        var selectors = [], froms = [], wheres = [], values = [], into = null;
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
            if(node.type == NODE_CHILD_TYPE_INTO) {
                into = node.value;
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
            parseResult["into"] = into;
            return parseResult;
        }
    }
}