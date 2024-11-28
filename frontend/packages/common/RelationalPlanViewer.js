import {useEffect, useState} from "react";
import {PlanViewer} from "./PlanViewer";




const formatCount = (count) => {
    if (count > 1000000000000) {
        return `${(count / 1000000000000).toFixed(2)}T`
    } else if (count > 1000000000) {
        return `${(count / 1000000000).toFixed(2)}B`
    } else if (count > 1000000) {
        return `${(count / 1000000).toFixed(2)}M`
    } else if (count > 1000) {
        return `${(count / 1000).toFixed(2)}k`
    } else {
        return count
    }
}

const Expression = ({data}) => {
    if (data.type === "expression_leaf") {
        if (data.leaf_type === "column") {
            return <div style={{display: "inline"}}>{data.displayName}</div>
        } else if (data.leaf_type === "constant") {
            return <div style={{display: "inline"}}>{data.value}</div>
        } else if (data.leaf_type === "unknown") {
            return <div style={{display: "inline"}}>{"?"}</div>
        } else if (data.leaf_type === "null") {
            return <div style={{display: "inline"}}>{"null"}</div>
        }
    } else if (data.type === "expression_inner") {
        const toRender = [data.strings[0]]
        for (let i = 0; i < data.subExpressions.length; i++) {
            toRender.push(<Expression data={data.subExpressions[i]}/>)
            toRender.push(<div style={{display: "inline"}}>{data.strings[i + 1]}</div>)
        }
        return <div style={{display: "inline"}}>
            {toRender}
        </div>
    }
}
const OperatorContainer = ({heading, children}) => {
    return <div style={{padding: 5}}>
        <div style={{
            fontWeight: 700,
            textAlign: "center",
            fontSize: "medium"
        }}>{heading}
        </div>
        <div style={{
            fontWeight: 400,
            textAlign: "left",
            fontSize: "small",
            whitSpace: "pre-line"
        }}>
            {children}
        </div>
    </div>
}

const joinSymbol = (joinType) => {

    if (joinType === "inner") {
        return "\u2a1d"
    } else if (joinType === "leftouter") {
        return "\u27d5"
    } else if (joinType === "rightouter") {
        return "\u27d6"
    } else if (joinType === "fullouter") {
        return "\u27d7"
    } else if (joinType === "single") {
        return "\u27d51"
    } else if (joinType === "leftmark") {
        return "\u27d5\u1D39"
    } else if (joinType === "rightmark") {
        return "\u27d6\u1D39"
    } else if (joinType === "leftsemi") {
        return "\u22c9"
    } else if (joinType === "rightsemi") {
        return "\u22ca"
    } else if (joinType === "leftanti") {
        return "\u25b7"
    } else if (joinType === "rightanti") {
        return "\u25c1"
    }

}
const Operator = ({data}) => {
    if (data.operator === "tablescan") {
        return <OperatorContainer heading={`\u2637\u2003 ${data.tablename}`}>
            <div><b>Table Size:</b> {data.tableSize}</div>
        </OperatorContainer>
    } else if (data.operator === "selection") {
        return <OperatorContainer heading={`\u03c3\u2003 Selection`}>
            <Expression data={data.condition}/>
        </OperatorContainer>
    } else if (data.operator === "topk") {
        return <OperatorContainer heading={`\u21de\u2003 TopK`}>
            <div><b>Limit:</b> {data.limit}</div>
            <div><b>Order:</b> {data.order.map((order) => <div><Expression data={order.value}/> {order.direction}
            </div>)}</div>
        </OperatorContainer>
    } else if (data.operator === "sort") {
        return <OperatorContainer heading={`\u21de\u2003 Sort`}>
            <div>{data.order.map((order) => <div><Expression data={order.value}/> {order.direction}
            </div>)}</div>
        </OperatorContainer>
    } else if (data.operator === "aggregation") {
        return <OperatorContainer heading={`\u0393\u2003 Aggregation`}>
            <div><b>Keys:</b> {data.keys.map((key) => <Expression data={key}/>)}</div>
            <div><b>Aggregates:</b> {data.aggregates.map((agg) => <div><Expression data={agg.computed}/>: <Expression
                data={agg.aggregation}/></div>)}</div>
        </OperatorContainer>
    } else if (data.operator === "materialize") {
        return <OperatorContainer heading={`\u03c0\u2003 Materialize`}>
            <div><b>Output:</b> {data.output.map((output) => <div>{output.name}: <Expression data={output.column}/>
            </div>)}</div>
        </OperatorContainer>
    } else if (data.operator === "join") {
        const joinImpl = data.joinImpl === "hash" ? "HashJoin" : (data.joinImpl === "nested" ? "NestedLoopJoin" : "IndexNestedLoopJoin")
        return <OperatorContainer heading={`${joinSymbol(data.joinType)}\u2003 ${joinImpl}`}>
            <div><b>Comparisons:</b> {data.comparisons.map((comp) => <div><Expression data={comp}/></div>)}</div>
            <div><b>Condition:</b> <Expression data={data.condition}/></div>
        </OperatorContainer>
    } else if (data.operator === "map") {
        return <OperatorContainer heading={`\u2254\u2003 Map`}>
            {data.computed.map((comp) => <div><Expression data={comp.computed}/>: <Expression data={comp.expression}/>
            </div>)}
        </OperatorContainer>
    } else if (data.operator == "window") {
        return <OperatorContainer heading={`\u{1FA9F}\u2003 Window`}>
            <div>{data.frame.start} to {data.frame.end}</div>
            <div><b>Partition By:</b> {data.partition.map((expr) => <Expression data={expr}/>)}</div>
            <div><b>Order By:</b> {data.order.map((expr) => <div><Expression data={expr.value}/> {expr.direction}
            </div>)}</div>
            <div><b>Aggregates:</b> {data.aggregates.map((agg) => <div><Expression data={agg.computed}/>: <Expression
                data={agg.aggregation}/></div>)}</div>
        </OperatorContainer>
    } else if (data.operator == "union") {
        return <OperatorContainer heading={`\u222a\u2003 Union`}>
            {data.semantics}
        </OperatorContainer>
    } else if (data.operator === "except") {
        return <OperatorContainer heading={`\u2216\u2003 Except`}>
            {data.semantics}
        </OperatorContainer>
    } else if (data.operator === "intersect") {
        return <OperatorContainer heading={`\u2229\u2003 Intersect`}>
            {data.semantics}
        </OperatorContainer>
    } else if (data.operator === "rename") {
        return <OperatorContainer heading={`\u03c1\u2003 Rename`}>
            {data.renamed.map((rename) => <div><Expression data={rename.old}/> -> <Expression data={rename.new}/>
            </div>)}
        </OperatorContainer>
    } else if (data.operator === "limit") {
        return <OperatorContainer heading={`\u21de\u2003 Limit`}>
            <div>{data.limit}</div>
        </OperatorContainer>
    } else if (data.operator === "tmp") {
        return <OperatorContainer heading={`Tmp`}>
        </OperatorContainer>
    } else if (data.operator === "crossproduct") {
        return <OperatorContainer heading={`\u2a2f\u2003 CrossProduct`}>
        </OperatorContainer>
    } else if (data.operator === "constrelation") {
        return <OperatorContainer heading={`\u03c1\u2003 ConstRelation`}>
            <div>{data.attributes.map((col) => <div style={{display: "inline"}}><Expression
                data={col}/>,</div>)}:={data.values.map((row) => <div style={{display: "inline"}}>[{row.map((val) =>
                <div style={{display: "inline"}}><Expression data={val}/>,</div>)}],</div>)}</div>
        </OperatorContainer>
    } else if (data.operator === "projection") {
        return <OperatorContainer heading={`\u03c0\u2003 Projection`}>
            <div>{data.semantics}</div>
            <b>Columns:</b>
            <div>{data.columns.map((proj) => <div><Expression data={proj}/></div>)}</div>
        </OperatorContainer>

    } else {
        return <OperatorContainer heading={"? Unknown Operator"}/>
    }
}
export const RelationalPlanViewer = ({height, width, input, onOperatorSelect, selectedOps}) => {

    const [cardinalitySlope, setCardinalitySlope] = useState(1)
    const [minCardinality, setMinCardinality] = useState(0)

    const [nodes, setNodes] = useState(undefined)
    const [edges, setEdges] = useState(undefined)

    const process = (inputs) => {
        let currMinCardinality = Number.MAX_VALUE
        let maxCardinality = Number.MIN_VALUE
        let currNodes= []
        let currEdges = []
        inputs.forEach((input_elem) => {
            currNodes.push(input_elem);
            input_elem.consuming.forEach((child) => {
                currEdges.push([input_elem.ref, child.ref, {
                    label: (child.cardinality || child.cardinality === 0) ? `${formatCount(child.cardinality)} est: ${formatCount(child.estimatedCardinality)}` : formatCount(child.estimatedCardinality),
                    cardinality: child.cardinality,
                    estimatedCardinality: child.estimatedCardinality
                }])
                if (child.cardinality || child.cardinality === 0) {
                    currMinCardinality = Math.min(currMinCardinality, child.cardinality)
                    maxCardinality = Math.max(maxCardinality, child.cardinality)
                }
                if (child.estimatedCardinality || child.estimatedCardinality === 0) {
                    currMinCardinality = Math.min(currMinCardinality, child.estimatedCardinality)
                    maxCardinality = Math.max(maxCardinality, child.estimatedCardinality)
                }
            })
        })
        currMinCardinality = Math.log(currMinCardinality)
        maxCardinality = Math.log(maxCardinality)
        console.log(currMinCardinality, maxCardinality, (20 - 1) / (maxCardinality - minCardinality))
        setCardinalitySlope((20 - 1) / (maxCardinality - minCardinality))
        setMinCardinality(currMinCardinality)
        setNodes(currNodes)
        setEdges(currEdges)


    }

    useEffect(() => {
        process(input)

    }, [input])



    return(nodes&&edges&& <PlanViewer nested={false} height={height} width={width} nodes={nodes} edges={edges} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps} renderNode={(node, x, y,rerender)=>(<div style={{
        transform: `translate(${x}px, ${y}px)`,
        position: "absolute",
        border: "1px solid black",
        backgroundColor: selectedOps.includes(node.ref) ? "yellow":"white",
        borderRadius: 5,
        minWidth: 100,
    }} id={`plan-${node.ref}`} onClick={()=>onOperatorSelect(node.ref)}>
        <Operator data={node}/>
    </div>)} renderEdge={(edge) => {
        let estimatedStrokeWidth=(Math.log(edge.estimatedCardinality) - minCardinality) * cardinalitySlope + 1
        let cardStrokeWidth=(Math.log(edge.cardinality) - minCardinality) * cardinalitySlope + 1
        let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");
        return <g>
            <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                      stroke={"white"} strokeWidth={estimatedStrokeWidth} strokeLinecap={"square"} strokeOpacity={0.5}></polyline>
            <polyline key={`edge2,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                      stroke={"blue"} strokeWidth={cardStrokeWidth} strokeLinecap={"square"} strokeOpacity={0.5}></polyline>
            <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                  strokeWidth={"0.2"} fontSize={10}>{edge.label}</text>
        </g>

    }}/>)
}