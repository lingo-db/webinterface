import dagreD3 from 'dagre-d3';

import PlanNode, {Iu, Attribute, Aggregate, OptimizerStep, Order, Restriction, GroupByNode} from './models/Plan';
import Const, * as Constants from './models/Constant';

import s from './NodeBody.module.scss';
import Expression, {IuRefExpression} from './models/Expression';


/** map join types to symbols */
const joinTable = new Proxy({
    inner: {name: 'inner-join', symbol: '\u2a1d'},
    leftouter: {name: 'left-outer-join', symbol: '\u27d5'},
    rightouter: {name: 'right-outer-join', symbol: '\u27d6'},
    fullouter: {name: 'full-outer-join', symbol: '\u27d7'},
    single: {name: 'single-join', symbol: '\u27d51'},
    leftmark: {name: 'left-mark-join', symbol: '\u27d5\u1D39'},
    rightmark: {name: 'right-mark-join', symbol: '\u27d6\u1D39'},
    leftsemi: {name: 'left-semi-join', symbol: '\u22c9'},
    rightsemi: {name: 'right-semi-join', symbol: '\u22ca'},
    leftanti: {name: 'left-anti-join', symbol: '\u25b7'},
    rightanti: {name: 'right-anti-join', symbol: '\u25c1'}
} as { [key: string]: { name: string, symbol: string | undefined } }, {
    get: (target, p: string): { name: string, symbol: string | undefined } =>
        target.hasOwnProperty(p) ? target[p] : {name: p, symbol: undefined}
});

/** join a string with commas while keeping the line length below 80 */
function joinWithCommas(es: string[]): string {
    let lines: string[] = [];
    let line: string = '';
    for (let e of es) {
        line += (line.length ? ', ' : '') + e
    }
    if (line.length)
        lines.push(line);
    return lines.join('\n');
}

/** unicode symbols for setoperations */
function getSetoperationSymbol(operation: string): string {
    switch (operation) {
        case 'unionall': return '\u228E\u2003'
        case 'union': return '\u22C3\u2003';
        case 'intersectall': return '\u2A40\u2003'
        case 'intersect': return '\u2229\u2003';
        case 'exceptall': return '\u2238\u2003'
        case 'except': return '\u2216\u2003';
        default: return '';
    }
}

/**
 * format a cardinality human-readable
 * @param cardinality the cardinality
 * @param precision how many digits to show
 */
function formatCardinality(cardinality: number, precision: number): string {
    const si = 'kMGT';
    let normCard = cardinality, suffix = '';
    for (let i = 0; normCard > 1_000 && i !== si.length; i++, normCard /= 1_000)
        suffix = si[i];
    // we show at least two significant digits
    let card = normCard >= (10 ** precision) ? Math.round(normCard) : Number(normCard.toPrecision(precision));
    return `${card}${suffix}`;
}


/** functions to fill node body */
const operators: ((node: PlanNode) => string | undefined)[] = [
    node => 'earlyprobe' === node.operator && node.analyzePlanCardinality !== undefined
        ? 'Selectivity: ' + (node.analyzePlanCardinality / node.input.analyzePlanCardinality!).toFixed(3)
        : undefined,
    node => {
        if (!('join' === node.operator && node.analyzePlanCardinality !== undefined)) {
            return undefined;
        }
        let pipelineCardinality = node.physicalOperator !== 'indexnljoin' ? node.right.analyzePlanCardinality : node.left.analyzePlanCardinality;
        return 'Selectivity: ' + (node.analyzePlanCardinality / pipelineCardinality!).toFixed(3);
    },
    node => 'tablescan' === node.operator && undefined !== node.tableSize
        ? 'Table Size: ' + formatCardinality(node.tableSize, 3)
        : undefined,
    node => 'tablescan' === node.operator && undefined !== node.tableSize && node.cardinality && node.cardinality !== node.tableSize
        ? 'Selectivity: ' + (100 * node.cardinality / node.tableSize).toPrecision(3) + '%'
        : undefined,
    node => undefined !== node.cardinality && undefined !== node.analyzePlanCardinality
        ? 'Estimated Cardinality: ' + formatCardinality(node.cardinality, 3)
        : undefined,
    node => undefined !== node.cardinality && undefined !== node.analyzePlanCardinality
        ? 'Est. Q-Error: ' + (Math.max(node.analyzePlanCardinality, node.cardinality) / Math.min(node.analyzePlanCardinality, node.cardinality)).toPrecision(3)
        : undefined,
    node => 'select' === node.operator
        ? expressionToString(node.condition)
        : undefined,
    node => 'join' === node.operator && !('const' === node.condition.expression && Constants.isBool(node.condition.value) && node.condition.value.value)
        ? '\n' + expressionToString(node.condition)
        : undefined,
    node => 'map' === node.operator
        ? joinWithCommas(node.values.map(v => iuName(v.iu) + ' \u2254 ' + expressionToString(v.exp)))
        : undefined,
    node => 'groupjoin' === node.operator && node.behavior !== 'inner'
        ? 'Behavior: ' + node.behavior
        : undefined,
    node => 'groupjoin' === node.operator
        ? '\nKeys:\n' + node.keyLeft.map((left, i) => expressionToString(node.valuesLeft[left.arg]) + ' = ' + expressionToString(node.valuesRight[node.keyRight[i].arg])).join('\n')
        : undefined,
    node => 'groupjoin' === node.operator && (node.aggregatesLeft.length + node.aggregatesRight.length)
        ? '\nAggregates:\n' +
        (node.aggregatesLeft.length ? aggregatesToString(node.aggregatesLeft, node.valuesLeft) : '') +
        (node.aggregatesRight.length ? aggregatesToString(node.aggregatesRight, node.valuesRight) : '')
        : undefined,
    node => 'tablescan' === node.operator && node.restrictions.length
        ? '\n' + restrictionToString(node.attributes, node.restrictions)
        : undefined,
    node => 'tablescan' === node.operator && node.residuals.length
        ? '\n' + node.residuals.map(e => expressionToString(e)).join('\n')
        : undefined,
    node => 'inlinetable' === node.operator && node.values.length
        ? node.values.map(e => expressionToString(e)).join(', ')
        : undefined,
    node => 'inlinetable' === node.operator && node.restrictions.length
        ? restrictionToString(node.attributes, node.restrictions)
        : undefined,
    node => 'inlinetable' === node.operator && node.residuals.length
        ? node.residuals.map(e => expressionToString(e)).join('\n')
        : undefined,
    node => 'groupby' === node.operator && node.aggregates.length
        ? 'Aggregates:\n' + aggregatesToString(node.aggregates, node.values)
        : undefined,
    node => 'groupby' === node.operator && node.key.length
        ? 'Keys: ' + joinWithCommas(node.key.map(k => node.values[k.arg]).map(expressionToString))
        : undefined,
    node => 'sort' === node.operator && node.limit
        ? 'Limit: ' + node.limit
        : undefined,
    node => 'sort' === node.operator && node.order
        ? '\n' + orderToString(node.order)
        : undefined,
    node => 'earlyprobe' === node.operator && node.ius.length
        ? '\n' + joinWithCommas(node.ius.map(expressionToString))
        : undefined,
    node => 'setoperation' === node.operator
        ? '\n' + node.arguments.map(arg => joinWithCommas(arg.columns.map(expressionToString))).join(`\n${getSetoperationSymbol(node.operation)}\n`)
        : undefined,
    node => 'tempscan' === node.operator
        ? '\n' + joinWithCommas(node.output.map(o => iuName(o.iu)))
        : undefined,
    node => 'window' === node.operator && node.partitions.length
        ? node.partitions.map(partition =>
            (partition.key.length ? 'partition by ' + joinWithCommas(partition.key.map(k => expressionToString(node.values[k.value]))) + '\n' : '') +
                partition.orders.map(orderGroup =>
                    (orderGroup.order.length ? 'order by ' + orderGroup.order.map(o => expressionToString(node.values[o.value])) + '\n' : '') +
                    orderGroup.operations.map(op =>
                        `${op.frame.range} between ${op.frame.start.mode} and ${op.frame.end.mode}\n` + // TODO: exclusion and preceding/following value
                        `${iuName(op.op.iu)} \u2254 ${op.op.op}(${op.op.arg !== undefined ? expressionToString(node.values[op.op.arg]) : ''})`
                    )
                )
        ).join('\n\n')
        : undefined,
];

/**
 * parse restrictions of tablescan or inlinetable node
 * @param attributes node attributes
 * @param restrictions node restrictions
 */
function restrictionToString(attributes: Attribute[], restrictions: Restriction[]): string {
    return restrictions.map((restriction) => {
        switch (restriction.mode) {
            case 'false':
                return 'false';
            case 'isnotnull':
                return `${attributes[restriction.attribute].name} IS NOT NULL`;
            case '=':
            case '!=':
            case 'is':
            case 'isnot':
            case '<':
            case '<=':
            case '>':
            case '>=':
                return `${attributes[restriction.attribute].name} ${restriction.mode} ${expressionToString(restriction.value)}`;
            case '[]':
                return `${attributes[restriction.attribute].name} between ${expressionToString(restriction.value)} and ${expressionToString(restriction.upper)}`;
            case '(]':
                return `${attributes[restriction.attribute].name} between exclusive ${expressionToString(restriction.value)} and ${expressionToString(restriction.upper)}`;
            case '[)':
                return `${attributes[restriction.attribute].name} between ${expressionToString(restriction.value)} and exclusive ${expressionToString(restriction.upper)}`;
            case '()':
                return `${attributes[restriction.attribute].name} between exclusive ${expressionToString(restriction.value)} and exclusive ${expressionToString(restriction.upper)}`;
            case 'filter':
                return expressionToString(restriction.value);
            default:
                return JSON.stringify(restriction);
        }
    }).join('\n');
}

/**
 * create typed string from constant
 * @param constant object to convert to string
 * @return typed string
 */
function constToString(constant: Const): string {
    if (Constants.isNull(constant))
        return 'null';
    if (Constants.isBool(constant) || Constants.isInteger(constant))
        return '' + constant.value;
    if (Constants.isNumeric(constant))
        return '' + constant.value / Math.pow(10, constant.type.scale || 0);
    if (Constants.isText(constant) || Constants.isChar(constant))
        return '\'' + constant.value + '\'';
    if (Constants.isChar1(constant))
        return '\'' + String.fromCharCode(constant.value) + '\'';
    if (Constants.isDate(constant))
        return 'date \'' + new Date((Number(constant.value) - 2440587.5) * 86400000).toISOString().split('T')[0] + '\'';
    if (Constants.isInterval(constant))
        return `interval '${Number.parseInt(constant.value2.toString(16).slice(0, -8) || '0', 16)} months ${constant.value2 & 0xffffffff} days ${constant.value} microseconds'`;
    if (Constants.isTimestamp(constant)) {
        const micros = (constant.value / 1_000) % 1_000;
        const second = Math.floor((constant.value / 1_000_000) % 60);
        const minute = Math.floor((constant.value / 60_000_000) % 60);
        const hour = Math.floor((constant.value / 3_600_000_000) % 24);
        const day = Math.floor((constant.value / 86_400_000_000));
        return 'timestamp \'' + new Date(new Date((Number(day) - 2440587.5) * 86400000).setUTCHours(hour, minute, second, micros)).toISOString().replace('T', ' ').replace('Z', '') + '\'';
    }
    if (Constants.isTimestampTZ(constant)) {
        const micros = (constant.value / 1_000) % 1_000;
        const second = Math.floor((constant.value / 1_000_000) % 60);
        const minute = Math.floor((constant.value / 60_000_000) % 60);
        const hour = Math.floor((constant.value / 3_600_000_000) % 24);
        const day = Math.floor((constant.value / 86_400_000_000));
        return 'timestamp with time zone \'' + new Date(new Date((Number(day) - 2440587.5) * 86400000).setUTCHours(hour, minute, second, micros)).toISOString().replace('T', ' ') + '\'';
    }
    if (Constants.isTime(constant)) {
        const nanos = constant.value % 1_000_000;
        const second = Math.floor((constant.value / 1_000_000) % 60);
        const minute = Math.floor((constant.value / 60_000_000) % 60);
        const hour = Math.floor(constant.value / 3_600_000_000);
        return `time ${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}:${second < 10 ? '0' + second : second}.${nanos}`;
    }
    return JSON.stringify(constant);
}

/**
 * parse sort order
 * @param order object to convert to string
 * @return sort order as string
 */
function orderToString(order: Order[]): string {
    return order.map(element => expressionToString(element.value) + (element.descending ? ' desc' : '')).join(',\n');
}

/**
 * parse expression
 * @param expression object to convert to string
 * @return expression as string
 */
function expressionToString(expression: Expression): string {
    switch (expression.expression) {
        case 'null':
            return 'null';
        case 'const':
            return constToString(expression.value);
        case 'iuref':
            return isNaN(Number(`${expression.iu}`)) ? expression.iu : `iu${expression.iu}`;
        case 'not':
            return `not ${expressionToString(expression.input)}`;
        case 'abs':
            return `abs(${expressionToString(expression.input)})`;
        case 'isnull':
            return `${expressionToString(expression.input)} IS NULL`;
        case 'isnotnull':
            return `${expressionToString(expression.input)} IS NOT NULL`;
        case 'cast': {
            // if the input of the case is any arithmetic operation, put it in brackets
            let needed: boolean = (["add", "sub", "mul", "div", "rem"].indexOf(expression.input.expression) >= 0);
            let optionalBrackets: string = needed ? `(${expressionToString(expression.input)})` : expressionToString(expression.input);
            return `${optionalBrackets}::${expression.type.type}`;
        }
        case 'add':
            return `${expressionToString(expression.left)} + ${expressionToString(expression.right)}`;
        case 'sub':
            return `${expressionToString(expression.left)} - ${expressionToString(expression.right)}`;
        case 'mul':
        case 'div':
        case 'rem': {
            // for *, /, and %, any +, -, and cast on either left or right side should be in brackets
            let left: string = (["add", "sub"].indexOf(expression.left.expression) >= 0) ? `(${expressionToString(expression.left)})` : `${expressionToString(expression.left)}`;
            let right: string = (["add", "sub"].indexOf(expression.right.expression) >= 0) ? `(${expressionToString(expression.right)})` : `${expressionToString(expression.right)}`;
            // return the correct operator sign
            switch (expression.expression) {
                case 'mul':
                    return `${left} * ${right}`;
                case 'div':
                    return `${left} / ${right}`;
                case 'rem':
                    return `${left} % ${right}`;
                default:
                    // cannot be reached
                    return "UNREACHABLE";
            }
        }
        case 'pow': {
            // for the power, put the left and right side in brackets for any operator
            let left: string = (["add", "sub", "mul", "div", "rem"].indexOf(expression.left.expression) >= 0) ? `(${expressionToString(expression.left)})` : `${expressionToString(expression.left)}`;
            let right: string = (["add", "sub", "mul", "div", "rem"].indexOf(expression.right.expression) >= 0) ? `(${expressionToString(expression.right)})` : `${expressionToString(expression.right)}`;
            return `${left} ^ ${right}`;
        }
        case 'shiftleft':
            return `${expressionToString(expression.left)} << ${expressionToString(expression.right)}`;
        case 'shiftright':
            return `${expressionToString(expression.left)} >> ${expressionToString(expression.right)}`;
        case 'bitand':
            return `${expressionToString(expression.left)} bit_and ${expressionToString(expression.right)}`;
        case 'bitor':
            return `${expressionToString(expression.left)} bit_or ${expressionToString(expression.right)}`;
        case 'bitxor':
            return `${expressionToString(expression.left)} bit_xor ${expressionToString(expression.right)}`;
        case 'round2':
            return `round(${expressionToString(expression.left)}, ${expressionToString(expression.right)})`;
        case 'compare':
            return `${expressionToString(expression.left)} ${expression.direction} ${expressionToString(expression.right)}`;
        case 'and':
        case 'or':
            return singleOrMultiple(expression.input, expressionToString, `\n${expression.expression} `, '', '');
        case 'between': {
            const [string, left, right] = expression.input;
            return `${expressionToString(string)} between ${expressionToString(left)} and ${expressionToString(right)}`;
        }
        case 'substring': {
            const [string, strPos, extChar] = expression.input;
            return `substring(${expressionToString(string)} from ${expressionToString(strPos)} for ${expressionToString(extChar)})`;
        }
        case 'similar': {
            const [string, pattern, escape] = expression.input;
            return expressionToString(string) + ' similar to ' + expressionToString(pattern) + (escape ? ' escape ' + expressionToString(escape) : '');
        }
        case 'like': {
            const [string, pattern, escape] = expression.input;
            return expressionToString(string) + ' like ' + expressionToString(pattern) + (escape ? ' escape ' + expressionToString(escape) : '');
        }
        case 'ilike': {
            const [string, pattern, escape] = expression.input;
            return expressionToString(string) + ' ilike ' + expressionToString(pattern) + (escape ? ' escape ' + expressionToString(escape) : '');
        }
        case 'in':
            return singleOrMultiple(expression.input) + ' in (' + joinWithCommas(expression.values.map(e => constToString(e))) + ')';
        case 'quantified':
            return expressionToString(expression.input) + expression.direction + singleOrMultiple(expression.values);
        case 'extractyear':
        case 'extractmonth':
        case 'extractday':
        case 'extracthour':
        case 'extractminute':
        case 'extractsecond':
            return `extract(${expression.expression.substring('extract'.length)} from ${expressionToString(expression.input)})`;
        case 'localdate':
            return 'current_date';
        case 'localtime':
            return 'current_time';
        case 'currenttimestamp':
            return 'current_timestamp';
        case 'searchedcase':
            return `case ${expression.cases.map(value => `when ${expressionToString(value.condition)} then ${expressionToString(value.result)}`).join(' ')} ${expression.else ? `else ${expressionToString(expression.else)}` : ''} end`;
        case 'simplecase':
            return `case ${expressionToString(expression.input)} ${expression.cases.map(value => `when ${expressionToString(value.value)} then ${expressionToString(value.result)}`).join(' ')} ${expression.else ? `else ${expressionToString(expression.else)}` : ''} end`;
        case 'coalesce':
            return `coalesce(${expression.values.map(expressionToString).join(', ')})`;
        case 'concat':
            return `${expression.expression}(${expression.input.map(expressionToString).join(', ')})`;
        case 'upper':
            return `${expression.expression}(${expressionToString(expression.input)})`;
        case 'startswith':
            return `starts_with(${expression.input.map(expressionToString).join(', ')})`;
        case 'call':
            return `${expression.fn}(${expression.input.map(expressionToString).join(', ')})`;
        default:
            return JSON.stringify(expression);
    }
}

/**
 * print aggregates
 * @param aggregates the aggregates to convert
 * @param values the aggregated values referenced by the aggregates
 */
function aggregatesToString(aggregates: Aggregate[], values: IuRefExpression[]): string {
    return aggregates.map(agg => `${iuName(agg.iu)} \u2254 ${agg.op}(${agg.arg !== undefined ? expressionToString(values[agg.arg]) : ''})`).join('\n') + '\n'
}

/**
 * get the name of an IU
 * @param iu the iu
 */
function iuName(iu: Iu): string {
    return typeof iu === "string" ? iu : iu.iu;
}

/**
 * convert array to string depending on element count
 * @param arr object to convert to string
 * @param toString function to apply to each element
 * @param delimiter string delimiter
 * @param prefix opening parenthesis
 * @param suffix closing parenthesis
 * @return arguments combined using delimiter and prefix, suffix
 */
function singleOrMultiple(arr: any[], toString: (x: any) => string = expressionToString, delimiter: string = ', ', prefix: string = '(', suffix: string = ')'): string {
    switch (arr.length) {
        case 0:
            return prefix + suffix;
        case 1:
            return toString(arr[0]);
        default:
            return prefix + arr.map(toString).join(delimiter) + suffix;
    }
}

/** normalized graph element */
export type PlanGraphElement = {
    /** node with dagre properties */
    node: {
        id: string,
        data: dagreD3.Label
    },
    /** node children */
    children: PlanGraphElement[],
    /** PipelinebreakerScan scanned operator id */
    scannedOperator?: string,
    /** earlyprobe id */
    earlyprobe?: string
}

/**
 * Covert query plan from server request to normalized plan
 */
export class NormalizePlan {
    /** optimizerStep to normalize */
    private query: OptimizerStep;
    /** biggest cardinality in graph */
    private maxCardinality: number;
    /** lowest cardinality in graph */
    private minCardinality: number;

    constructor(query: OptimizerStep) {
        this.query = query;
        this.maxCardinality = 1;
        this.minCardinality = Infinity;
    }

    /**
     * create root element with its children
     */
    public getGraph(): PlanGraphElement {
        const labelElem = NormalizePlan.createNodeBody({
            operator: 'result',
            operatorId: 0
        });

        const minDuration = this.query.plan.analyzePlanPipelines
            ? Math.min(...this.query.plan.analyzePlanPipelines.map(pipeline => pipeline.duration)) : undefined;
        const maxDuration = this.query.plan.analyzePlanPipelines
            ? Math.max(...this.query.plan.analyzePlanPipelines.map(pipeline => pipeline.duration)) : undefined;

        return {
            children: [this.createNode(this.query.plan.plan)],
            node: {
                id: '0',
                data: {
                    label: labelElem,
                    hasChildren: true,
                    planNodeProperties: {
                        operator: 'result',
                        output: this.query.plan.output,
                        ...(this.query.plan.analyzePlanPipelines && {pipelines: this.query.plan.analyzePlanPipelines})
                    },
                    minDuration,
                    maxDuration,
                    minCardinality: this.minCardinality,
                    maxCardinality: this.maxCardinality,
                }
            }
        };
    }

    /**
     * create plan nodes recursively
     * @param node current node to normalize
     * @return normalized element with its children
     */
    private createNode(node: PlanNode): PlanGraphElement {
        let props: any = {...node};
        let children: PlanGraphElement[] = [];

        // Check if a temp reference, is a new node
        function isNewNode(ref: PlanNode | number): ref is PlanNode {
            return (ref as PlanNode).operator !== undefined;
        }

        // child attributes to children array
        ['left', 'input', 'pipelineBreaker', 'magic', 'right'].forEach(param => {
            if (param in props && props[param] !== 0 && isNewNode(props[param])) {
                let child: PlanNode = props[param];
                if (param === 'magic') {
                    // magic group bys get their incoming tuples from the left input of the parent join
                    let magic = child as GroupByNode;
                    let left = props['left'];
                    magic.magicCardinality = left.analyzePlanCardinality !== undefined ? left.analyzePlanCardinality : left.cardinality;
                }
                children.push(this.createNode(child));
            }
        });
        ['left', 'input', 'pipelineBreaker', 'magic', 'right'].forEach(param => delete props[param]);
        // MultiwayJoin
        if ('inputs' in props) {
            props['inputs'].forEach((input: any) => {
                if (isNewNode(input.op)) {
                    let child: PlanNode = input.op;
                    children.push(this.createNode(child));
                }
            })
            delete props['inputs'];
        }
        // SetOperation
        if ('arguments' in props) {
            props['arguments'].forEach((input: any) => {
                if (isNewNode(input.input)) {
                    let child: PlanNode = input.input;
                    children.push(this.createNode(child));
                }
            })
            delete props['arguments'];
        }

        const cardinality = "magicCardinality" in node && node.magicCardinality !== undefined ? node.magicCardinality :
            undefined !== node.analyzePlanCardinality ? node.analyzePlanCardinality : node.cardinality;
        // recalculate min/max cardinality
        this.minCardinality = Math.min(this.minCardinality, cardinality || Infinity);
        this.maxCardinality = Math.max(this.maxCardinality, cardinality || 0);
        // convert cardinality to human-readable
        const cardinalityString = cardinality ? formatCardinality(cardinality, 2) : undefined;

        // calculate pipeline color and width
        const pipelineColor = undefined !== node.analyzePlanId && this.query.plan.analyzePlanPipelines
            ? `hsl(${360 * this.query.plan.analyzePlanPipelines.findIndex(pipeline =>
                pipeline.operators.includes(node.analyzePlanId!)) / this.query.plan.analyzePlanPipelines.length},100%,40%)` : undefined;
        const duration = undefined !== node.analyzePlanId && this.query.plan.analyzePlanPipelines
            ? this.query.plan.analyzePlanPipelines.find(pipeline => pipeline.operators.includes(node.analyzePlanId!))?.duration : undefined;

        let nodeBody = NormalizePlan.createNodeBody(node);

        return {
            node: {
                id: '' + node.operatorId,
                data: {
                    label: nodeBody,
                    hasChildren: !!children.length,
                    planNodeProperties: props,
                    cardinalityString,
                    pipelineColor,
                    duration
                }
            },
            children,
            scannedOperator: 'scannedOperator' in props ? '' + props.scannedOperator : undefined,
            earlyprobe: 'source' in props ? '' + props.source : undefined,
        };
    }

    /**
     * Convert node to HTML
     * @param node node to convert
     * @return HTML element representing the node
     */
    private static createNodeBody(node: PlanNode): HTMLDivElement {
        const labelElem = document.createElement('div');

        const labelElemHeader = document.createElement('div');
        labelElemHeader.setAttribute('class', s.nodeHeader);
        labelElemHeader.innerText = NormalizePlan.getHeader(node);
        labelElem.appendChild(labelElemHeader);

        const labelElemBody = document.createElement('div');
        labelElemBody.setAttribute('class', s.nodeBody);

        const bodyText = operators.map(fn => fn(node)).filter(s => undefined !== s) as string[];
        // force newline at first body
        if (bodyText.length && bodyText[0].charAt(0) !== '\n')
            bodyText.unshift('');

        labelElemBody.innerText = bodyText.join('\n');

        labelElem.appendChild(labelElemBody);
        return labelElem;
    }

    /**
     * return title with symbol
     * @param node node from which to retrieve title
     * @return node title
     */
    private static getHeader(node: PlanNode): string {
        //result
        if ('result' === node.operator) {
            return '=\u2003RESULT';
        }
        //join
        if ('join' === node.operator) {
            //cross-product
            if ('const' === node.condition.expression && Constants.isBool(node.condition.value) && node.condition.value.value) {
                return `\u2a2f\u2003CROSS-PRODUCT`;
            }
            const symbol = joinTable[node.type].symbol;
            if (symbol)
                return `${symbol}\u2003${node.physicalOperator?.toUpperCase() || "JOIN"}`;
        }
        //tablescan
        if ('tablescan' === node.operator) {
            return '\u2637\u2003' + node.tablename.toUpperCase();
        }
        //tempscan
        if ('tempscan' === node.operator) {
            return '\u2637\u2003' + node.operator.toUpperCase();
        }
        //groupBy
        if ('groupby' === node.operator) {
            return '\u0393\u2003' + node.operator.toUpperCase();
        }
        //map
        if ('map' === node.operator) {
            return '\u03c7\u2003' + node.operator.toUpperCase();
        }
        //sort
        if ('sort' === node.operator) {
            return '\u21de\u2003' + node.operator.toUpperCase();
        }
        //select
        if ('select' === node.operator) {
            return `\u03c3\u2003${node.operator.toUpperCase()}`;
        }
        //groupJoin
        if ('groupjoin' === node.operator) {
            return `\u25b7\u0393\u2003${node.operator.toUpperCase()}`;
        }
        // Temp
        if ('temp' === node.operator) {
            return `\u{1F552}\u2003${node.operator.toUpperCase()}`;
        }
        // SetOperation
        if ('setoperation' === node.operator) {
            let setOp: any = node;
            if ('unionall' === setOp.operation)     return `${getSetoperationSymbol(setOp.operation)}UNION ALL`;
            if ('union' === setOp.operation)        return `${getSetoperationSymbol(setOp.operation)}UNION`;
            if ('intersectall' === setOp.operation) return `${getSetoperationSymbol(setOp.operation)}INTERSECT ALL`;
            if ('intersect' === setOp.operation)    return `${getSetoperationSymbol(setOp.operation)}INTERSECT`;
            if ('exceptall' === setOp.operation)    return `${getSetoperationSymbol(setOp.operation)}EXCEPT ALL`;
            if ('except' === setOp.operation)       return `${getSetoperationSymbol(setOp.operation)}EXCEPT`;
        }
        // Window
        if ('window' === node.operator) {
            return `\u{1FA9F}\u2003${node.operator.toUpperCase()}`;
        }
        return node.operator.toUpperCase();
    }
}