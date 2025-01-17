import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Container, Form, Navbar, Row} from 'react-bootstrap';
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
const computeRef = (d) => {
    if (d.producing === "parent") {
        return `${d.parent}-arg-${d.argnr}`
    } else {
        return d.producing
    }
}
const Expression = ({data}) => {
    if (data.type === "expression_leaf") {
        if (data.leaf_type === "column") {
            return <div style={{display: "inline"}}>{data.displayName}</div>
        }else if (data.leaf_type === "external_column") {
            return <div style={{display: "inline", color:"darkgreen",border:"1px solid green"}}>{data.displayName}</div>
        } else if (data.leaf_type === "constant") {
            return <div style={{display: "inline"}}>{data.value}</div>
        } else if (data.leaf_type === "unknown") {
            return <div style={{display: "inline"}}>{"?"}</div>
        } else if (data.leaf_type === "null") {
            return <div style={{display: "inline"}}>{"null"}</div>
        }else if (data.leaf_type==="member"){
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

const Operator = ({data, onOperatorSelect, selectedOps}) => {

    if (data.type === "execution_step") {
        let nodes = data.subops
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
            results.push(<div style={{
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
        data.inputs.forEach(input => {
            if(input.used) {
                nodes.push({
                    ref: computeRef(input.argument),
                    type: "arg",
                    consuming: [],
                    accesses: []
                })
            }
        })


        let edges = []
        nodes.forEach((n) => {
            n.consuming.forEach((c) => {
                    edges.push([c, n.ref, {type: "stream"}])
                }
            )
            n.accesses.forEach((c) => {
                    edges.push([computeRef(c), n.ref, {type: "access"}])
                }
            )
        })

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
                <PlanViewer nested={true} height={1000} width={700} rankSep={20} nodeSep={30} nodes={nodes} edges={edges}
                            renderNode={(node, x, y) => (
                                <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                              selectedOps={selectedOps}/>)}
                            renderEdge={(edge) => {
                                let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");

                                return <g>
                                    {edge.type==="access"&&
                                    <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                              stroke={"darkgreen"} strokeWidth={2} strokeLinecap={"square"}
                                              strokeOpacity={0.7}></polyline>}
                                    {edge.type==="stream"&&
                                    <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                              stroke={"white"} strokeWidth={20}
                                              strokeLinecap={"square"} strokeOpacity={1}></polyline>}
                                    <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                                          strokeWidth={"0.2"} fontSize={10}>{edge.label}</text>
                                </g>

                            }} drawExtra={(nodesPos, requiredHeight) => {
                    if (nodesPos) {
                        return <g> {data.inputs.filter(input=>input.used).map(input => {
                            let n = nodesPos[computeRef(input.argument)]

                            return <line x1={n.computedX} y1={n.computedY} x2={input.argument.argnr * 40 + 20} y2="0"
                                         fill={"none"}
                                         stroke={"darkgreen"} strokeWidth={2} strokeLinecap={"square"}
                                         strokeOpacity={0.7}></line>
                        })}

                            {data.results.map((result, i) => {
                                let n = nodesPos[computeRef(result)]
                                return <line x1={n.computedX} y1={n.computedY} x2={i * 40 + 20} y2={requiredHeight}
                                             fill={"none"}
                                             stroke={"brown"} strokeWidth={2} strokeLinecap={"square"}
                                             strokeOpacity={0.7}></line>
                            })}

                        </g>
                    } else {
                        return undefined
                    }
                }}/>
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
            return <OperatorContainer heading={"Merge"}></OperatorContainer>
        } else if (data.subop === "scan") {
            return <OperatorContainer heading={"Scan"}>
                {data.mapping.map((m) => <div>{m.member} → <Expression data={m.column}/></div>)}
            </OperatorContainer>
        } else if (data.subop === "scan_list") {
            return <OperatorContainer heading={"Scan(List)"}>
                Element → <Expression data={data.elem}/>
            </OperatorContainer>
        } else if (data.subop === "scan_ref") {
            return <OperatorContainer heading={"ScanRefs"}>
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
            let nodes = []
            data.inputs.forEach(input => {
                nodes.push({
                    ref: computeRef(input.argument),
                    type: "col_arg",
                    col: input.inputCol,
                    consuming: [],
                    accesses: []
                })
            })
            let lastStep = undefined
            let edges = []

            data.subops.forEach((planNode) => {
                nodes.push(planNode)
                planNode.consuming.forEach((p) => {
                    edges.push([p.ref, planNode.ref, {}])
                })
                if (planNode.type === "execution_step") {
                    if (lastStep) {
                        edges.push([lastStep, planNode.ref, {type: "executionOrder"}])
                    }
                    planNode.inputs.forEach((input) => {
                        edges.push([computeRef(input.input), planNode.ref, {
                            type: "requiredInputs",
                            meta: {
                                off1: 40 + 40 * input.input.resnr,
                                off2: 40 + 40 * input.argument.argnr
                            }
                        }])

                    })
                    lastStep = planNode.ref
                }
            })
            nodes.forEach((n) => {
                n.consuming.forEach((c) => {
                        edges.push([c, n.ref, {type: "stream"}])
                    }
                )
                n.accesses.forEach((c) => {
                        edges.push([computeRef(c), n.ref, {type: "access"}])
                    }
                )
            })

            nodes.forEach((n) => {
                n.consuming.forEach((c) => {
                        edges.push([c, n.ref, {type: "stream"}])
                    }
                )
                n.accesses.forEach((c) => {
                        edges.push([computeRef(c), n.ref, {type: "access"}])
                    }
                )
            })
            data.implicitEdges.forEach(({from, to}) => {
                edges.push([computeRef(from), computeRef(to), {}])
                nodes.push({
                    ref: computeRef(to),
                    type: "implicit",
                    consuming: [],
                    accesses: []
                })
            })
            data.implicitInputs.forEach((i) => {
                nodes.push({
                    ref: computeRef(i),
                    type: "implicit",
                    consuming: [],
                    accesses: []
                })
            })
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
                    <PlanViewer nested={true} height={1000} width={700} rankSep={50} nodeSep={50} nodes={nodes} edges={edges}
                                renderNode={(node, x, y) => (
                                    <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                                  selectedOps={selectedOps}/>)}
                                renderEdge={(edge,nodesPos) => {
                                    if (edge.type === "requiredInputs") {
                                        let edgePoints = edge.points.map((point) => {
                                            return {x: point.x, y: point.y}
                                        })

                                        //edgePoints[0].x = nodesPos[edge.id.v].renderX + edge.meta.off1
                                        edgePoints[edgePoints.length - 1].x = nodesPos[edge.id.w].renderX + edge.meta.off2
                                        edgePoints[edgePoints.length - 1].y = nodesPos[edge.id.w].renderY+2
                                        let points = edgePoints.map((point) => `${point.x},${point.y}`).join(" ");

                                        return <g>
                                            <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points}
                                                      fill={"none"}
                                                      stroke={"darkgreen"} strokeWidth={2}
                                                      strokeLinecap={"square"} strokeOpacity={0.7} ></polyline>
                                        </g>
                                    }else {
                                        let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");

                                        return <g>
                                            <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points}
                                                      fill={"none"}
                                                      stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                                      strokeOpacity={0.5}></polyline>
                                            <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                                                  strokeWidth={"0.2"} fontSize={10}>{edge.label}</text>
                                        </g>
                                    }

                                }} drawExtra={(nodesPos, requiredHeight) => {
                        if (nodesPos) {


                        } else {
                            return undefined
                        }
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
        }else if (data.subop === "materialize") {
            return <OperatorContainer heading={"Materialize"}>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        }else if (data.subop === "lookup_or_insert") {
            return <OperatorContainer heading={"LookupOrInsert"}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        }else if (data.subop === "insert") {
            return <OperatorContainer heading={"Insert"}>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        }else if (data.subop === "lookup") {
            return <OperatorContainer heading={"Lookup"}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        }else if (data.subop === "get_begin_reference") {
            return <OperatorContainer heading={"GetBegin"}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        }else if (data.subop === "get_end_reference") {
            return <OperatorContainer heading={"GetEnd"}>
                Ref: <Expression data={data.reference}/>
            </OperatorContainer>
        }else if (data.subop === "entries_between") {
            return <OperatorContainer heading={"EntriesBetween"}>
                diff(<Expression data={data.leftRef}/>,<Expression data={data.rightRef}/>)  → <Expression data={data.between}/>

            </OperatorContainer>
        }else if (data.subop === "offset_reference_by") {
            return <OperatorContainer heading={"OffsetBy"}>
                <Expression data={data.reference}/>+<Expression data={data.offset}/>  → <Expression data={data.newRef}/>

            </OperatorContainer>
        }else if (data.subop === "unwrap_optional_ref") {
            return <OperatorContainer heading={"UnwrapOptionalRef"}>
                <Expression data={data.optionalRef}/>?  → <Expression data={data.reference}/>

            </OperatorContainer>
        }   else if (data.subop === "gather") {
            return <OperatorContainer heading={"Gather"}>
                {data.mapping.map((m) => <div>{m.member} → <Expression data={m.column}/></div>)}

            </OperatorContainer>
        }else if (data.subop === "scatter") {
            return <OperatorContainer heading={"Scatter"}>
                Ref: <Expression data={data.reference}/>
                {data.mapping.map((m) => <div><Expression data={m.column}/> →{m.member}</div>)}

            </OperatorContainer>
        }else if (data.subop === "reduce") {
            return <OperatorContainer heading={"Reduce"}>
                Ref: <Expression data={data.reference}/>
                {data.updated.map((u) => <div>{u.member} = <Expression data={u.expression}/></div>)}

            </OperatorContainer>
        }  else {
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
        let lastStep = undefined
        let currEdges = []
        let currNodes = []
        subOpPlan.forEach((planNode) => {
            currNodes.push(planNode)
            planNode.consuming.forEach((p) => {
                currEdges.push([p.ref, planNode.ref, {}])
            })
            if (planNode.type === "execution_step") {
                if (lastStep) {
                    currEdges.push([lastStep, planNode.ref, {type: "executionOrder"}])
                }
                planNode.inputs.forEach((input) => {
                    currEdges.push([computeRef(input.input), planNode.ref, {
                        type: "requiredInputs",
                        meta: {
                            off1: 40 + 40 * input.input.resnr,
                            off2: 40 + 40 * input.argument.argnr
                        }
                    }])

                })
                lastStep = planNode.ref
            }

        })
        setNodes(currNodes)
        setEdges(currEdges)
    }

    useEffect(() => {
        process(input)

    }, [input])


    return (nodes && edges && <PlanViewer nested={false} height={height} width={width} rankSep={50} nodeSep={50} nodes={nodes} edges={edges}
                                          renderNode={(node, x, y) => (
                                              <RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect}
                                                            selectedOps={selectedOps}/>)}
                                          renderEdge={(edge, nodesPos) => {
                                              let edgePoints = edge.points.map((point) => {
                                                  return {x: point.x, y: point.y}
                                              })

                                              if (edge.type === "requiredInputs") {
                                                  edgePoints[0].x = nodesPos[edge.id.v].renderX + edge.meta.off1
                                                  edgePoints[edgePoints.length - 1].x = nodesPos[edge.id.w].renderX + edge.meta.off2
                                                  edgePoints[edgePoints.length - 1].y = nodesPos[edge.id.w].renderY+2
                                                  let points = edgePoints.map((point) => `${point.x},${point.y}`).join(" ");

                                                  return <g>
                                                      <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points}
                                                                fill={"none"}
                                                                stroke={"darkgreen"} strokeWidth={2}
                                                                strokeLinecap={"square"} strokeOpacity={0.7} ></polyline>
                                                  </g>
                                              } else if (edge.type === "executionOrder") {
                                                  //do not render edges inserted to get execution order right
                                                  return undefined
                                              }

                                          }}/>)
}