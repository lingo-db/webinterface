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

const RenderedNode = ({data, x, y, onOperatorSelect, selectedOps}) => {
    if (data.type==="col_arg"){
        return <div style={{
            transform: `translate(${x}px, ${y}px)`,
            position: "absolute",
            minWidth: 5,
            backgroundColor: "white"
        }} id={`plan-${data.ref}`}>
            {data.col.displayName}
        </div>
    }else
    if (data.type === "arg" || data.type==="implicit") {
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
            backgroundColor:   selectedOps.includes(data.ref) ? "yellow":"white",
            borderRadius: 5,
            minWidth: 100,
        }} id={`plan-${data.ref}`} onClick={(e)=>{e.stopPropagation();onOperatorSelect(data.ref)}}>
            <Operator data={data} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps} />
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
            inputs.push(<div style={{
                minWidth: 100,
                fontWeight: 700,
                fontSize: "medium",
                textAlign: "center",
                borderRadius: 5,
                border: "1px solid black",
                display: "inline-block"
            }}>I{i}
            </div>)
        }
        let results = []
        for (let i = 0; i < numResults; i++) {
            results.push(<div style={{
                minWidth: 100,
                fontWeight: 700,
                fontSize: "medium",
                textAlign: "center",
                borderRadius: 5,
                border: "1px solid black",
                display: "inline-block"
            }}>R{i}
            </div>)
        }
        data.inputs.forEach(input => {
            nodes.push({
                ref: computeRef(input.argument),
                type: "arg",
                consuming: [],
                accesses: []
            })
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
                <PlanViewer nested={true} height={1000} width={700} nodes={nodes} edges={edges}
                            renderNode={(node, x, y) => (<RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps}/>)}
                            renderEdge={(edge) => {
                                let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");

                                return <g>
                                    <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                              stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                              strokeOpacity={0.5}></polyline>
                                    <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                                          strokeWidth={"0.2"} fontSize={10}>{edge.label}</text>
                                </g>

                            }} drawExtra={(nodesPos, requiredHeight) => {
                    if (nodesPos) {
                        return <g> {data.inputs.map(input => {
                            let n = nodesPos[computeRef(input.argument)]

                            return <line x1={n.computedX} y1={n.computedY} x2={input.argument.argnr * 100 + 50} y2="0"
                                         fill={"none"}
                                         stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                         strokeDasharray={"2 2"}
                                         strokeOpacity={0.5}></line>
                        })}

                            {data.results.map((result, i) => {
                                let n = nodesPos[computeRef(result)]
                                return <line x1={n.computedX} y1={n.computedY} x2={i * 100 + 50} y2={requiredHeight}
                                             fill={"none"}
                                             stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                             strokeDasharray={"2 2"}
                                             strokeOpacity={0.5}></line>
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
        if (data.subop === "nested_map") {
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
            let lastStep=undefined
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
                                off1: 70 + 100 * input.input.resnr,
                                off2: 70 + 100 * input.argument.argnr
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
            data.implicitInputs.forEach((i)=>{
                nodes.push({ref: computeRef(i),
                    type: "implicit",
                    consuming:[],
                    accesses:[]})
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
                    <PlanViewer nested={true} height={1000} width={700} nodes={nodes} edges={edges}
                                renderNode={(node, x, y) => (<RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps}/>)}
                                renderEdge={(edge) => {
                                    let points = edge.points.map((point) => `${point.x},${point.y}`).join(" ");

                                    return <g>
                                        <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                                  stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                                  strokeOpacity={0.5}></polyline>
                                        <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                                              strokeWidth={"0.2"} fontSize={10}>{edge.label}</text>
                                    </g>

                                }} drawExtra={(nodesPos, requiredHeight) => {
                        if (nodesPos) {


                        } else {
                            return undefined
                        }
                    }}/>
                </div>
            </div>


        } else if (data.subop === "get_external") {
            return <OperatorContainer heading={"GetExternal"}/>
        } else if (data.subop === "gather") {
            return <OperatorContainer heading={"Gather"}>
                {data.mapping.map((m) => <div>{m.member} → <Expression data={m.column}/></div>)}

            </OperatorContainer>
        } else if (data.subop === "scan_ref") {
            return <OperatorContainer heading={"ScanRefs"}></OperatorContainer>
        } else if (data.subop === "materialize") {
            return <OperatorContainer heading={"Materialize"}>
                {data.mapping.map((m) => <div> <Expression data={m.column}/>  →{m.member}</div>)}

            </OperatorContainer>
        } else if (data.subop === "merge") {
            return <OperatorContainer heading={"Merge"}></OperatorContainer>
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
        let lastStep = undefined
        let currEdges=[]
        let currNodes=[]
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
                            off1: 70 + 100 * input.input.resnr,
                            off2: 70 + 100 * input.argument.argnr
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



    return (nodes&&edges&&<PlanViewer nested={false} height={height} width={width} nodes={nodes} edges={edges}
                        renderNode={(node, x, y) => (<RenderedNode x={x} y={y} data={node} onOperatorSelect={onOperatorSelect} selectedOps={selectedOps}/>)}
                        renderEdge={(edge, nodesPos) => {
                            let edgePoints = edge.points.map((point) => {
                                return {x: point.x, y: point.y}
                            })

                            if (edge.type === "requiredInputs") {
                                edgePoints[0].x = nodesPos[edge.id.v].renderX + edge.meta.off1
                                edgePoints[edgePoints.length - 1].x = nodesPos[edge.id.w].renderX + edge.meta.off2
                                let points = edgePoints.map((point) => `${point.x},${point.y}`).join(" ");

                                return <g>
                                    <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                              stroke={"white"} strokeWidth={1} strokeLinecap={"square"}
                                              strokeOpacity={0.5}></polyline>
                                </g>
                            } else if (edge.type === "executionOrder") {
                                let points = edgePoints.map((point) => `${point.x},${point.y}`).join(" ");

                                return <g>
                                    <polyline key={`edge,${edge.id.v},${edge.id.w}`} points={points} fill={"none"}
                                              stroke={"gray"} strokeWidth={1} strokeLinecap={"square"}
                                              strokeDasharray={"4"}
                                              strokeOpacity={0.5}></polyline>
                                    <text x={edge.points[1].x + 20} y={edge.points[1].y} stroke={"black"}
                                          strokeWidth={"0.2"} fontSize={10}>Order
                                    </text>
                                </g>
                            }

                        }}/>)
}