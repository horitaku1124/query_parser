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

    let baseTable = [];
    if(froms.length > 0) {
        baseTable = dataScope[froms[0]];
    }
    console.log("baseTable", baseTable);

    for(let i = 1;i < froms.length;i++) {
        let next = froms[i];
        let next2 = froms[i + 1];
        if(next == "JOIN") {
            next = "LEFT";
            next2 = "JOIN";
        }
        i += 2;
        if(next == "INNER" && next2 == "JOIN") {
            let newBaseTable = [];
            let joinTable = dataScope[froms[i]];
            let joinOn = froms[i + 1] == "ON";
            let joinLeft = joinOn ? froms[i + 2] : null,
                joinExpression = joinOn ? froms[i + 3] : null,
                joinRight = joinOn ? froms[i + 4] : null;
            for(let j = 0;j < baseTable.length;j++) {
                for(let k = 0;k < joinTable.length;k++) {
                    if (joinOn) {
                        let left = baseTable[j][joinLeft], right = joinTable[k][joinRight];
                        let result = false;
                        switch(joinExpression) {
                            case "=":
                                result = left == right;
                                break;
                        }
                        if(!result) continue;
                    }
                    let newRow = {};
                    Object.assign(newRow, baseTable[j]);
                    Object.assign(newRow, joinTable[k]);
                    let leftValue =
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
    let newRow, result, expression, resultSource = [];
    for(let i = 0;i < dataSource.length;i++) {
        let row = dataSource[i];
        let resultRow = [];
        for(let j = 0;j < wheres.length;j += 2) {
            let subject = row[wheres[j][0]];
            expression = wheres[j][1];
            let object = wheres[j][2];
            result = false;
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
            newRow = [];
            let left = resultRow[0], right = resultRow[2];
            expression = resultRow[1];

            result = false;
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
                newRow = {};
                for(let key of selectors) {
                    if(key == "*") {
                        for(let key2 in row) {
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

function escapeByCharacter(chars) {
    let index = 0;
    while(true) {
        index = chars.indexOf("\\", index);
        if(index < 0) {
            break;
        }
        let c = chars.charAt(index + 1);
        let replaceTo = " ";
        switch (c) {
            case "'":
                replaceTo = "'";
                break;
            case "\"":
                replaceTo = "\"";
                break;
            case "n":
                replaceTo = "\n";
                break;
            default:
                break;
        }
        chars = chars.substring(0, index) + replaceTo + chars.substring(index + 2);
        index--;
    }
    return chars;
}