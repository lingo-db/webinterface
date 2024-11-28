import Type, {
    BoolType,
    CharType,
    Char1Type,
    DateType,
    IntegerType,
    IntervalType,
    NumericType,
    TextType, TimestampType,
    TimestampTZType, TimeType
} from './Type';


interface BaseConst<T extends Type> {
    type: T
}

interface NullConst<T extends Type = any> extends BaseConst<T> {
    null: true;
}

interface NonNullConst<T extends Type, V> extends BaseConst<T> {
    value: V;
}

interface BoolConst extends NonNullConst<BoolType, boolean> {
}

interface IntegerConst extends NonNullConst<IntegerType, number> {
}

interface NumericConst extends NonNullConst<NumericType, number> {
}

interface TextConst extends NonNullConst<TextType, string> {
}

interface CharConst extends NonNullConst<CharType, string> {
}

interface Char1Const extends NonNullConst<Char1Type, number> {
}

interface DateConst extends NonNullConst<DateType, string> {
}

interface IntervalConst extends NonNullConst<IntervalType, number> {
    value2: number;
}

interface TimestampConst extends NonNullConst<TimestampType, number> {
}

interface TimestampTZConst extends NonNullConst<TimestampTZType, number> {
}

interface TimeConst extends NonNullConst<TimeType, number> {
}

type Const =
    | NullConst
    | BoolConst
    | IntegerConst
    | NumericConst
    | TextConst
    | CharConst
    | Char1Const
    | DateConst
    | IntervalConst
    | TimestampConst
    | TimestampTZConst
    | TimeConst;

export default Const;

export function isNull(constant: Const): constant is NullConst {
    return 'null' in constant && constant.null;
}

export function isBool(constant: Const): constant is BoolConst {
    return 'bool' === constant.type.type;
}

export function isInteger(constant: Const): constant is IntegerConst {
    return 'integer' === constant.type.type || 'bigint' === constant.type.type;
}

export function isNumeric(constant: Const): constant is NumericConst {
    return 'numeric' === constant.type.type || 'bignumeric' === constant.type.type || 'double' === constant.type.type;
}

export function isText(constant: Const): constant is TextConst {
    return 'text' === constant.type.type;
}

export function isChar(constant: Const): constant is CharConst {
    return 'char' === constant.type.type;
}

export function isChar1(constant: Const): constant is Char1Const {
    return 'char1' === constant.type.type;
}

export function isDate(constant: Const): constant is DateConst {
    return 'date' === constant.type.type;
}

export function isInterval(constant: Const): constant is IntervalConst {
    return 'interval' === constant.type.type;
}

export function isTimestampTZ(constant: Const): constant is TimestampTZConst {
    return 'timestamptz' === constant.type.type;
}

export function isTimestamp(constant: Const): constant is TimestampConst {
    return 'timestamp' === constant.type.type;
}

export function isTime(constant: Const): constant is TimeConst {
    return 'time' === constant.type.type;
}
