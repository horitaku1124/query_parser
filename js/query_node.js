const TYPE_NONE = 0,
    TYPE_COLUMN = 1,
    TYPE_FROM = 2,
    TYPE_WHERE = 3,
    TYPE_VALUES = 4,
    TYPE_ORDERS = 5;

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
        if(typeof this._children === 'undefined') {
            this._children = [];
        }
        this._children.push(node);
    }
}