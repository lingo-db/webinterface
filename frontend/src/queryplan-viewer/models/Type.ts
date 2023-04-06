interface BaseType<T extends string = string> {
    type: T;
    nullable?: true;
}

export interface BoolType extends BaseType<'Bool'> {
}

export interface IntegerType extends BaseType<'Integer'> {
}

export interface TextType extends BaseType<'Text'> {
}

export interface CharType extends BaseType<'Char'> {
}

export interface Char1Type extends BaseType<'Char1'> {
}

export interface DateType extends BaseType<'Date'> {
}

export interface IntervalType extends BaseType<'Interval'> {
}

export interface NumericType extends BaseType<'Numeric' | 'BigNumeric'> {
    scale: number;
    precision: number;
}

export interface TimestampType extends BaseType<'Timestamp'>{
}

export interface TimestampTZType extends BaseType<'TimestampTZ'>{
}

export interface TimeType extends BaseType<'Time'>{
}

type Type =
    | BoolType
    | IntegerType
    | TextType
    | CharType
    | Char1Type
    | DateType
    | IntervalType
    | NumericType
    | TimestampType
    | TimestampTZType
    | TimeType;

export default Type;
