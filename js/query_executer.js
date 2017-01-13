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
