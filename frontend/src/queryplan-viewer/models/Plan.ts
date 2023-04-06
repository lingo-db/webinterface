import Expression, {IuRefExpression} from './Expression';
import Type from './Type';

interface IuDef {
    iu: string;
    type: Type;
}

export type Iu = IuDef | string;

export interface Aggregate {
    op: string;
    arg: number;
    collate: string;
    iu: Iu;
}

export interface Attribute {
    name: string;
    iu: Iu;
}

export interface Order {
    value: Expression;
    descending?: true;
}

interface Key {
    arg: number;
    iu: Iu;
    collate: string;
}

interface WindowFrame {
    range: string;
    exclude: string;
    start: { mode: string, value: Expression };
    end: { mode: string, value: Expression };
}

interface WindowOp {
    frame: WindowFrame;
    op: Aggregate;
}

interface OrderGroup {
    order: { value: number, collate: string }[];
    operations: WindowOp[];
}

interface Partition {
    key: { value: number, collate: string }[];
    orders: OrderGroup[];
}

interface BaseRestriction<T extends string = string> {
    mode: T;
    attribute: number;
    value: Expression;
}

interface BetweenRestriction extends BaseRestriction<'[]' | '(]' | '[)' | '()'> {
    upper: Expression;
}

export type Restriction =
    | BaseRestriction<'false' | 'isnotnull' | '=' | '!=' | 'is' | 'isnot' | '<' | '<=' | '>' | '>=' | 'filter'>
    | BetweenRestriction;

export interface OptimizerStep {
    name: string;
    plan: Plan;
}

interface Plan {
    plan: PlanNode;
    output: { name: string, iu: string, collate: string }[];
    type: number;
    query: boolean;
    analyzePlanPipelines?: { start: number, stop: number, duration: number, operators: number[] }[];
}

interface AnalyzedNode {
    analyzePlanId: number;
    analyzePlanCardinality: number;
}

interface BaseNode<T extends string = string> extends Partial<AnalyzedNode> {
    operator: T;
    physicalOperator?: string;
    cardinality?: number;
    operatorId: number;
}

interface UnaryPlanNode<T extends string = string> extends BaseNode<T> {
    input: BaseNode;
}

interface BinaryPlanNode<T extends string = string> extends BaseNode<T> {
    left: BaseNode;
    right: BaseNode;
}

interface ResultNode extends BaseNode<'result'> {
}

interface SelectNode extends UnaryPlanNode<'select'> {
    condition: Expression;
}

interface MapNode extends UnaryPlanNode<'map'> {
    values: { iu: Iu, exp: Expression, input: IuRefExpression }[];
}

interface SortNode extends UnaryPlanNode<'sort'> {
    order: Order[];
    limit?: number;
}

export interface GroupByNode extends UnaryPlanNode<'groupby'> {
    values: IuRefExpression[];
    key: Key[];
    groupingMode: string;
    aggregates: Aggregate[];
    orders: Order[];
    groupingSets: number[];
    grouping: Iu;
    magicCardinality?: number;
}

interface JoinNode extends BinaryPlanNode<'join'> {
    condition: Expression;
    type: string;
    marker?: Iu;
}

interface GroupJoinNode extends BinaryPlanNode<'groupjoin'> {
    valuesLeft: IuRefExpression[];
    valuesRight: IuRefExpression[];
    keyLeft: Key[];
    keyRight: Key[];
    compareTypes: Type[];
    aggregatesLeft: Aggregate[];
    aggregatesRight: Aggregate[];
    ordersLeft: unknown[];
    ordersRight: unknown[];
    behavior: string;
}

interface TempNode extends BaseNode<'temp'> {
}

interface PipelineBreakerScanNode extends BaseNode<'tempscan'> {
    pipelineBreaker?: BaseNode;
    scannedOperator: number;
    output: { originalIU: string, iu: Iu }[];
}

interface TableScanNode extends BaseNode<'tablescan'> {
    attributes: Attribute[];
    restrictions: Restriction[];
    residuals: Expression[];
    tid: Iu;
    tableoid: Iu;
    rowstate: Iu;
    table: number;
    tableSize: number;
    tablename: string;
}

interface EarlyProbeNode extends UnaryPlanNode<'earlyprobe'> {
    source: number;
    ius: IuRefExpression[];
}

interface InlineTableNode extends BaseNode<'inlinetable'> {
    attributes: Attribute[];
    restrictions: Restriction[];
    residuals: Expression[];
    computations: unknown[];
    count: number;
    values: Expression[];
}

interface SetOperationArgument {
    input: BaseNode;
    columns: Expression[];
}

interface SetOperationNode extends BaseNode<'setoperation'> {
    arguments: SetOperationArgument[];
    operation: string;
}

interface MultiwayJoinNode extends BaseNode<'multiwayjoin'> {
    inputs: any[];
}

interface WindowNode extends BaseNode<'window'> {
    values: Expression[];
    partitions: Partition[];
}

type PlanNode =
    | ResultNode
    | SelectNode
    | MapNode
    | SortNode
    | GroupByNode
    | JoinNode
    | GroupJoinNode
    | TempNode
    | PipelineBreakerScanNode
    | TableScanNode
    | EarlyProbeNode
    | InlineTableNode
    | SetOperationNode
    | MultiwayJoinNode
    | WindowNode;

export default PlanNode;
