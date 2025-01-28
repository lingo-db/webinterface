import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {PlanViewer} from "./PlanViewer";


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

const Expression = ({data}) => {
    if (data.type === "expression_leaf") {
        if (data.leaf_type === "column") {
            return <div style={{display: "inline"}}>{data.displayName}</div>
        } else if (data.leaf_type === "external_column") {
            return <div
                style={{display: "inline", color: "darkgreen", border: "1px solid green"}}>{data.displayName}</div>
        } else if (data.leaf_type === "constant") {
            return <div style={{display: "inline"}}>{data.value}</div>
        } else if (data.leaf_type === "unknown") {
            return <div style={{display: "inline"}}>{"?"}</div>
        } else if (data.leaf_type === "null") {
            return <div style={{display: "inline"}}>{"null"}</div>
        } else if (data.leaf_type === "member") {
            return <div style={{display: "inline"}}>{data.member}</div>
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
const createNodesAndEdges = (ops, innerEdges) => {
    let currNodes = [];
    let currEdges = [];
    let extraEdges = []
    ops.forEach((planNode) => {
        currNodes.push(planNode)
        let tmpEdges = planNode.outerEdges.map(e => e)
        planNode.accesses.forEach((a) => {
            tmpEdges.push({type: "access", input: a, output: {type: "node", ref: planNode.ref, argnr: 0}})
        })
        tmpEdges = tmpEdges.map(e => {
            if (e.input.type === "nested_map_arg") {
                currNodes.push({
                    ref: e.input.id,
                    type: "col_arg",
                    col: e.input.column,
                    consuming: [],
                    accesses: []
                })
                return {type:e.type, input:{type:"node", ref:e.input.id, resnr:0}, output: e.output}
            } else {
                return e
            }
        })
        if(innerEdges){
            innerEdges.forEach((e)=>{
                console.log(e)
                tmpEdges.push({type: e.type, input: e.input, output:e.output})
            })
        }
        tmpEdges.forEach((e) => {

            if (e.input.type === "node" && e.output.type === "node") {
                currEdges.push([e.input.ref, e.output.ref, {type: e.type, meta: e}])
            } else {
                extraEdges.push(e)
            }
        })

    })
    return [currNodes, currEdges, extraEdges]
}
const renderEdges = (edge, nodesPos) => {
    let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");
    if (edge.type === "stream") {

        return <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                         stroke={"white"} strokeWidth={20}
                         strokeLinecap={"square"} strokeOpacity={1}></polyline>
    } else if (edge.type === "order") {
        //do not render order edges
        return undefined
    } else if (edge.type === "requiredInput") {
        if (nodesPos) {
            let edgePoints = edge.points.map((point) => {
                return {x: point.x, y: point.y}
            })
            edgePoints[0].x = nodesPos[edge.id.v].renderX + 40 + edge.meta.input.resnr * 40
            edgePoints[0].y =  nodesPos[edge.id.v].renderY+nodesPos[edge.id.v].height
            edgePoints[edgePoints.length - 1].x = nodesPos[edge.id.w].renderX + 40 + edge.meta.output.argnr * 40
            edgePoints[edgePoints.length - 1].y = nodesPos[edge.id.w].renderY
            let points = edgePoints.map((point) => `${point.x},${point.y}`).join(" ");
            return <g>
                <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points}
                          fill={"none"}
                          stroke={"darkgreen"} strokeWidth={2}
                          strokeLinecap={"square"} strokeOpacity={0.7}></polyline>
            </g>
        }
    } else if (edge.type === "access") {

        let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");
        return <g>
            <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points}
                      fill={"none"}
                      stroke={"darkgreen"} strokeWidth={2}
                      strokeLinecap={"square"} strokeOpacity={0.7}></polyline>
        </g>

    }

}
const renderExtraEdge = (edge, nodePos, requiredHeight) => {
    if (nodePos) {
        let inputX = 0;
        let inputY = 0;
        let outputX = 0;
        let outputY = 0;
        if (edge.input.type === "parentArg") {
            inputX = edge.input.argnr * 40 + 20
            inputY = 0
        }
        if (edge.output.type === "node") {
            outputX = nodePos[edge.output.ref].renderX + 40 + 40 * edge.output.argnr
            outputY = nodePos[edge.output.ref].renderY
        }
        if(edge.input.type ==="node"){
            inputX = nodePos[edge.input.ref].renderX + nodePos[edge.input.ref].width/2
            inputY = nodePos[edge.input.ref].renderY+nodePos[edge.input.ref].height
        }
        if (edge.output.type==="parentResult"){
            outputX = edge.input.resnr * 40 + 20
            outputY = requiredHeight
        }
        if (edge.type === "requiredInput") {
            return <line x1={inputX} y1={inputY} x2={outputX} y2={outputY}
                         fill={"none"}
                         stroke={"darkgreen"} strokeWidth={2} strokeLinecap={"square"}
                         strokeOpacity={0.7}></line>

        }
        if (edge.type === "access") {
            return <line x1={inputX} y1={inputY} x2={outputX} y2={outputY}
                         fill={"none"}
                         stroke={"darkgreen"} strokeWidth={2} strokeLinecap={"square"}
                         strokeOpacity={0.7}></line>

        }else if(edge.type === "resultEdge"){
            console.log(edge.input)
            return <line x1={inputX} y1={inputY} x2={outputX} y2={outputY}
                         fill={"none"}
                         stroke={"brown"} strokeWidth={2} strokeLinecap={"square"}
                         strokeOpacity={0.7}></line>
        }
    }
}
const RenderedNode = ({data, x, y, onOperatorSelect, selectedOps}) => {
    if (data.type === "col_arg") {
        return <div style={{
            transform: `translate(${x}px, ${y}px)`,
            position: "absolute",
            minWidth: 5,
            backgroundColor: "white"
        }} id={`plan-${data.ref}`}>
            {data.col.displayName}
        </div>
    } else if (data.type === "arg" || data.type === "implicit") {
        return <div style={{
            transform: `translate(${x}px, ${y}px)`,
            position: "absolute",
            minWidth: 5
        }} id={`plan-${data.ref}`}>
        </div>
    } else {
        return <div style={{
            transform: `translate(${x}px, ${y}px)`,
            position: "absolute",
            border: "1px solid black",
            backgroundColor: selectedOps.includes(data.ref) ? "yellow" : "white",
            borderRadius: 5,
            minWidth: 100,
        }} id={`plan-${data.ref}`} onClick={(e) => {
            e.stopPropagation();
            onOperatorSelect(data.ref)
        }}>
            <Operator data={data} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps}/>
        </div>
    }
}
const stateType=(data)=>{
    if(data.stateType){
        return ` [${data.stateType}]`
    }
    return ""
}
const Operator = ({data, onOperatorSelect, selectedOps}) => {

    if (data.type === "execution_step") {
        let numResults = data.results.length
        let numInputs = data.inputs.length
        let inputs = []
        for (let i = 0; i < numInputs; i++) {
            inputs.push(<div title={data.inputs[i].type} style={{
                width: 40,
                fontWeight: 800,
                fontSize: "medium",
                textAlign: "center",
                borderLeft: "1px solid black",
                borderRight: "1px solid black",
                display: "inline-block"
            }}>{"\u27dc"}
            </div>)
        }
        let results = []
        for (let i = 0; i < numResults; i++) {
            results.push(<div title={data.results[i].type} style={{
                width: 40,
                fontWeight: 800,
                fontSize: "medium",
                textAlign: "center",
                borderLeft: "1px solid black",
                borderRight: "1px solid black",
                display: "inline-block"
            }}>{"\u22b8"}
            </div>)
        }
        let [nodes, edges, extraEdges] = createNodesAndEdges(data.subops, data.innerEdges)



        return <div style={{display: "flex"}}>
            <div style={{

                fontWeight: 700,
                textAlign: "center",
                fontSize: "medium",


                writingMode: "vertical-rl",
                transform: "rotate(180deg)", /* Rotates the text to make it upright in vertical mode */
            }}>Step
            </div>
            <div style={{
                fontWeight: 400,
                textAlign: "left",
                fontSize: "small",
                whitSpace: "pre-line",
                flex: 1
            }}>
                <div>
                    {inputs}
                </div>
                <PlanViewer nested={true} height={1000} width={700} rankSep={20} nodeSep={30} nodes={nodes}
                            edges={edges}
                            renderNode={(node, x, y) => (
                                <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                              selectedOps={selectedOps}/>)}
                            renderEdge={renderEdges}
                            drawExtra={(nodesPos, requiredHeight) => {
                                return extraEdges.map(e => renderExtraEdge(e, nodesPos, requiredHeight))
                            }}
                />
                <div>
                    {results}
                </div>
            </div>
        </div>


    } else if (data.type === "suboperator") {
        if (data.subop === "create_thread_local") {
            return <OperatorContainer heading={"CreateThreadLocal"}/>
        } else if (data.subop === "get_external") {
            return <OperatorContainer heading={"GetExternal"}/>
        } else if (data.subop === "merge") {
            return <OperatorContainer heading={"Merge"+stateType(data)}></OperatorContainer>
        } else if (data.subop === "scan") {
            return <OperatorContainer heading={"Scan"+stateType(data)}>
                {data.mapping.map((m) => <div>{m.member} → <Expression data={m.column}/></div>)}
            </OperatorContainer>
        } else if (data.subop === "scan_list") {
            return <OperatorContainer heading={"Scan [List]"}>
                Element → <Expression data={data.elem}/>
            </OperatorContainer>
        } else if (data.subop === "scan_ref") {
            return <OperatorContainer heading={"ScanRefs"+stateType(data)}>
                Ref → <Expression data={data.reference}/>
            </OperatorContainer>
        } else if (data.subop === "union") {
            return <OperatorContainer heading={"Union"}/>
        } else if (data.subop === "map") {
            return <OperatorContainer heading={`\u2254\u2003 Map`}>
                {data.computed.map((comp) => <div><Expression data={comp.computed}/>: <Expression
                    data={comp.expression}/>
                </div>)}
            </OperatorContainer>
        } else if (data.subop === "filter") {
            return <OperatorContainer heading={`Filter (${data.semantic})`}>
                {data.columns.map((c) => (<div><Expression data={c}/></div>))}
            </OperatorContainer>
        } else if (data.subop === "renaming") {
            return <OperatorContainer heading={"Renaming"}>
                {data.renamed.map((r) => (<div><Expression data={r.old}/> → <Expression data={r.new}/></div>))}
            </OperatorContainer>
        } else if (data.subop === "nested_map") {
            let numInputs = data.inputs.length
            let inputs = []
            for (let i = 0; i < numInputs; i++) {
                inputs.push(<div title={data.inputs[i].type} style={{
                    width: 40,
                    fontWeight: 800,
                    fontSize: "medium",
                    textAlign: "center",
                    borderLeft: "1px solid black",
                    borderRight: "1px solid black",
                    display: "inline-block"
                }}>{"\u27dc"}
                </div>)
            }

            let [nodes, edges, extraEdges] = createNodesAndEdges(data.subops,data.innerEdges)


            return <div style={{display: "flex"}}>
                <div style={{

                    fontWeight: 700,
                    textAlign: "center",
                    fontSize: "medium",


                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)", /* Rotates the text to make it upright in vertical mode */
                }}>NestedMap
                </div>
                <div style={{
                    fontWeight: 400,
                    textAlign: "left",
                    fontSize: "small",
                    whitSpace: "pre-line",
                    flex: 1
                }}>
                    <div>
                        {inputs}
                    </div>
                    <PlanViewer nested={true} height={1000} width={700} rankSep={50} nodeSep={50} nodes={nodes}
                                edges={edges}
                                renderNode={(node, x, y) => (
                                    <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                                  selectedOps={selectedOps}/>)}
                                renderEdge={renderEdges}
                                drawExtra={(nodesPos, requiredHeight) => {
                                    return extraEdges.map(e => renderExtraEdge(e, nodesPos, requiredHeight))
                                }}/>
                </div>
            </div>


        } else if (data.subop === "create_from") {
            return <OperatorContainer heading={"CreateFrom"}/>
        } else if (data.subop === "create_simple_state") {
            return <OperatorContainer heading={"Create"}>
                SimpleState
            </OperatorContainer>
        } else if (data.subop === "create_heap") {
            return <OperatorContainer heading={"Create Heap"}>
            </OperatorContainer>
        } else if (data.subop === "generic_create") {
            return <OperatorContainer heading={"Create"}>

            </OperatorContainer>
        } else if (data.subop === "create_array") {
            return <OperatorContainer heading={"Create"}>
                Array
            </OperatorContainer>
        } else if (data.subop === "create_sorted_view") {
            return <OperatorContainer heading={"Create"}>
                SortedView
            </OperatorContainer>
        } else if (data.subop === "create_hash_indexed_view") {
            return <OperatorContainer heading={"Create"}>
                HashIndexedView
            </OperatorContainer>
        } else if (data.subop === "create_continuous_view") {
            return <OperatorContainer heading={"Create"}>
                ContinuousView
            </OperatorContainer>
        } else if (data.subop === "create_segment_tree_view") {
            return <OperatorContainer heading={"Create"}>
                SegmentTreeView
            </OperatorContainer>
        } else if (data.subop === "materialize") {
            return <OperatorContainer heading={"Materialize"+stateType(data)}>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        } else if (data.subop === "lookup_or_insert") {
            return <OperatorContainer heading={"LookupOrInsert"+stateType(data)}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        } else if (data.subop === "insert") {
            return <OperatorContainer heading={"Insert"+stateType(data)}>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        } else if (data.subop === "lookup") {
            return <OperatorContainer heading={"Lookup"+stateType(data)}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        } else if (data.subop === "get_begin_reference") {
            return <OperatorContainer heading={"GetBegin"+stateType(data)}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        } else if (data.subop === "get_end_reference") {
            return <OperatorContainer heading={"GetEnd"+stateType(data)}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        } else if (data.subop === "entries_between") {
            return <OperatorContainer heading={"EntriesBetween"}>
                diff(<Expression data={data.leftRef}/>,<Expression data={data.rightRef}/>) → <Expression
                data={data.between}/>

            </OperatorContainer>
        } else if (data.subop === "offset_reference_by") {
            return <OperatorContainer heading={"OffsetBy"}>
                <Expression data={data.reference}/>+<Expression data={data.offset}/> → <Expression data={data.newRef}/>

            </OperatorContainer>
        } else if (data.subop === "unwrap_optional_ref") {
            return <OperatorContainer heading={"UnwrapOptionalRef"}>
                <Expression data={data.optionalRef}/>? → <Expression data={data.reference}/>

            </OperatorContainer>
        } else if (data.subop === "gather") {
            return <OperatorContainer heading={"Gather"}>
                {data.mapping.map((m) => <div>{m.member} → <Expression data={m.column}/></div>)}

            </OperatorContainer>
        } else if (data.subop === "scatter") {
            return <OperatorContainer heading={"Scatter"}>
                Ref: <Expression data={data.reference}/>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        } else if (data.subop === "reduce") {
            return <OperatorContainer heading={"Reduce"}>
                Ref: <Expression data={data.reference}/>
                {data.updated.map((u) => <div>{u.member} = <Expression data={u.expression}/></div>)}

            </OperatorContainer>
        } else {
            return <OperatorContainer heading={"?"}></OperatorContainer>
        }
    } else {
        return <OperatorContainer heading={"?"}></OperatorContainer>
    }
}


export const SubOpPlanViewer = ({height, width, input, onOperatorSelect, selectedOps}) => {


    const [nodes, setNodes] = useState(undefined)
    const [edges, setEdges] = useState(undefined)

    const process = (subOpPlan) => {
        let [currNodes, currEdges, extraEdges] = createNodesAndEdges(subOpPlan)
        setNodes(currNodes)
        setEdges(currEdges)
    }

    useEffect(() => {
        process(input)

    }, [input])


    return (nodes && edges &&
        <PlanViewer nested={false} height={height} width={width} rankSep={50} nodeSep={50} nodes={nodes} edges={edges}
                    renderNode={(node, x, y) => (
                        <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                      selectedOps={selectedOps}/>)}
                    renderEdge={renderEdges} drawExtra={(nodesPos, requiredHeight) => {
        }}/>)
}