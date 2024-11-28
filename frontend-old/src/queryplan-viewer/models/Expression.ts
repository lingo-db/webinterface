import Const from './Constant';
import Type from './Type';
import {types} from "sass";
import Null = types.Null;


interface RootExpression<T extends string> {
    readonly expression: T;
}
interface NullExpression extends RootExpression<'null'> {
}
interface ConstExpression extends RootExpression<'const'> {
    value: Const;
}

export interface IuRefExpression extends RootExpression<'iuref'> {
    iu: string;
}

interface UnOpExpression extends RootExpression<'not' | 'abs' | 'isnull' | 'isnotnull' | 'upper'> {
    input: Expression;
}

interface CastExpression extends RootExpression<'cast'> {
    input: Expression;
    type: Type;
}

interface BinOpExpression extends RootExpression<'add' | 'sub' | 'mul' | 'div' | 'rem' | 'pow' | 'shiftleft' | 'shiftright' | 'bitand' | 'bitor' | 'bitxor' | 'round2'> {
    left: Expression;
    right: Expression;
}

interface NaryExpression extends RootExpression<'concat'> {
    input: Expression[];
}

interface CompareExpression extends RootExpression<'compare'> {
    left: Expression;
    right: Expression;
    direction: string;
}

interface MulOpExpression extends RootExpression<'and' | 'or'> {
    input: Expression[];
}

interface SubstringExpression extends RootExpression<'substring'> {
    input: [Expression, Expression, Expression];
}

interface BetweenExpression extends RootExpression<'between'> {
    input: [Expression, Expression, Expression];
}

interface PatternExpression extends RootExpression<'similar' | 'like' | 'ilike'> {
    input: [Expression, Expression, Expression?];
}

interface InExpression extends RootExpression<'in'> {
    input: Expression[];
    values: Const[];
}

interface QuantifiedExpression extends RootExpression<'quantified'> {
    input: Expression;
    direction: string;
    values: Expression[];
}

interface ExtractDateExpression extends RootExpression<'extractyear' | 'extractmonth' | 'extractday' | 'extracthour' | 'extractminute' | 'extractsecond'> {
    input: Expression;
}

interface LocalDateExpression extends RootExpression<'localdate'> {
    input: unknown[];
}

interface LocalTimeExpression extends RootExpression<'localtime'> {
    input: unknown[];
}

interface CurrentTimeStampExpression extends RootExpression<'currenttimestamp'> {
    input: unknown[];
}

interface SearchedCase {
    condition: Expression;
    result: Expression;
}

interface SearchedCaseExpression extends RootExpression<'searchedcase'> {
    cases: SearchedCase[];
    else: Expression;
}

interface SimpleCase {
    value: Expression;
    result: Expression;
}

interface SimpleCaseExpression extends RootExpression<'simplecase'> {
    input: Expression;
    cases: SimpleCase[];
    else: Expression;
}

interface CoalesceExpression extends RootExpression<'coalesce'> {
    values: Expression[];
}

interface StartsWithExpression extends RootExpression<'startswith'> {
    input: Expression[];
}
interface CallExpression extends RootExpression<'call'> {
    fn: string;
    input: Expression[];
}

type Expression =
    | ConstExpression
    | NullExpression
    | IuRefExpression
    | UnOpExpression
    | CastExpression
    | BinOpExpression
    | CompareExpression
    | MulOpExpression
    | SubstringExpression
    | BetweenExpression
    | PatternExpression
    | InExpression
    | QuantifiedExpression
    | ExtractDateExpression
    | LocalDateExpression
    | LocalTimeExpression
    | CurrentTimeStampExpression
    | SearchedCaseExpression
    | SimpleCaseExpression
    | CoalesceExpression
    | NaryExpression
    | StartsWithExpression
    | CallExpression;

export default Expression;
