import dagre from "@dagrejs/dagre";
import React, {memo, useEffect, useLayoutEffect, useRef, useState} from "react";

export const PlanViewer = memo(({
                                    nested,
                                    height,
                                    width,
                                    nodes,
                                    edges,
                                    renderNode,
                                    renderEdge,
                                    onRendered,
                                    drawExtra,
                                    nodeSep,
                                    rankSep,
                                }) => {

    //dagre.layout(g);
    const [internalEdges, setInternalEdges] = useState([])
    const isMounted = useRef(false);

    const stageWidth = width;
    const stageHeight = height;
    const [xOffset, setXOffset] = useState(0);
    const [yOffset, setYOffset] = useState(0);
    const [requiredWidth, setRequiredWidth] = useState(1000)
    const [requiredHeight, setRequiredHeight] = useState(1000)
    const [mouseDownLocation, setMouseDownLocation] = useState(null)
    const handleMouseDown = (e) => {
        setMouseDownLocation([e.pageX, e.pageY]);
    }
    const handleMouseUp = (e) => {
        setMouseDownLocation(null);
    }
    const handleMouseMove = (e) => {
        if (mouseDownLocation) {
            e.preventDefault()
            const diffX = e.pageX - mouseDownLocation[0];
            const diffY = e.pageY - mouseDownLocation[1];
            setXOffset(xOffset + diffX);
            setYOffset(yOffset + diffY);
            setMouseDownLocation([e.pageX, e.pageY])
        }
    }
    const [scale, setScale] = useState(1)
    const handleWheel = (e) => {
        let factor = e.deltaY / 100;
        let newScale = factor > 0 ? scale * factor : scale / -factor;
        setScale(newScale)
    }
    const [offsetString, setOffsetString] = useState("translate(0px, 0px)");
    const [svgOffsetString, setSvgOffsetString] = useState("translate(0px, 0px)");
    useEffect(() => {
        setOffsetString(`translate(${xOffset}px, ${yOffset}px) scale(${scale})`);
        setSvgOffsetString(`translate(${xOffset}px, ${yOffset}px) scale(${scale})`);
    }, [xOffset, yOffset, scale]);

    const [nodesLayout, setNodesLayout] = useState({})
    const [nodesPos, setNodesPos] = useState(undefined)

    const render = (nodes, edges) => {
        let uniqueIdCntr=0
        const g = new dagre.graphlib.Graph({multigraph:true}).setGraph({
            nodesep: nodeSep,
            ranksep: rankSep,
            marginy: nested ? 20 : 0,
            marginx: nested ? 10 : 0,
        });
        nodes.forEach((node) => {
            const element = document.getElementById(`plan-${node.ref}`)
            const nodeWidth = element.offsetWidth
            const nodeHeight = element.offsetHeight
            g.setNode(node.ref, {width: nodeWidth, height: nodeHeight});
        })
        edges.forEach((edge) => {
            g.setEdge(edge[0], edge[1], edge[2], uniqueIdCntr)
            uniqueIdCntr+=1
        })
        dagre.layout(g)

        let requiredWidth = g.nodes().reduce((maxWidth, nodeId) => {
            let node = g.node(nodeId);
            return Math.max(maxWidth, node.x + node.width / 2);
        }, 0)
        requiredWidth=g.edges().reduce((maxWidth,edgeId) => {
            let edge = g.edge(edgeId);
            return edge.points.reduce((maxWidth, p)=>{
                return Math.max(maxWidth, p.x+2)
            }, maxWidth)
        },requiredWidth)
        requiredWidth = requiredWidth + (nested ? 10 : 0);

        let minPoint=g.edges().reduce((minPoint,edgeId) => {
            let edge = g.edge(edgeId);
            return edge.points.reduce((minPoint, p)=>{
                return Math.min(minPoint, p.x)
            }, minPoint)
        },0)
        minPoint-=2
        requiredWidth-=minPoint
        const requiredHeight = g.nodes().reduce((maxHeight, nodeId) => {
            let node = g.node(nodeId);
            return Math.max(maxHeight, node.y + node.height / 2);
        }, 0) + (nested ? 20 : 0);
        setRequiredWidth(requiredWidth)
        setRequiredHeight(requiredHeight)
        const newScale = Math.min(stageWidth / requiredWidth, stageHeight / requiredHeight)
        setScale(newScale)
        setXOffset(-(requiredWidth - requiredWidth * newScale) / 2)
        setYOffset(-(requiredHeight - requiredHeight * newScale) / 2)


        let newNodesLayout = {}
        let newNodesPos = {}
        g.nodes().forEach((nodeId) => {
            let node = g.node(nodeId);
            if (node === undefined) {
                console.log("unknown node", nodeId, JSON.stringify(nodeId))
            }
            newNodesLayout[nodeId] = {
                x: node.x - node.width / 2-minPoint,
                y: node.y - node.height / 2,
                width: node.width,
                height: node.height
            }
            newNodesPos[nodeId] = {
                computedX: node.x+minPoint,
                computedY: node.y,
                renderX: node.x - node.width / 2-minPoint,
                renderY: node.y - node.height / 2,
                width: node.width,
                height: node.height
            }
        })
        setNodesPos(newNodesPos)
        setNodesLayout(newNodesLayout)
        let newEdges = []
        g.edges().forEach((edgeId) => {
            let edge = g.edge(edgeId);
            newEdges.push({
                id: edgeId,
                points: edge.points.map(p=>{return {x:p.x-minPoint, y:p.y}}),
                label: edge.label,
                cardinality: edge.cardinality,
                estimatedCardinality: edge.estimatedCardinality,
                type: edge.type,
                meta: edge.meta
            })
        })
        setInternalEdges(newEdges)

    }
    useEffect(() => {
        isMounted.current = true
        render(nodes, edges)
        let timer1 = setTimeout(() => {
            if (isMounted.current) render(nodes, edges)
        }, 500)
        let timer2 = setTimeout(() => {
            if (isMounted.current) render(nodes, edges)
        }, 1000)
        return () => {
            isMounted.current = false
            clearTimeout(timer1)
            clearTimeout(timer2)
        }
    }, [nodes, edges])


    if (nested) {
        return (
            <div>
                <div style={{
                    backgroundColor: "lightgray",
                    position: "relative",
                }} onClick={(e) => {
                    e.stopPropagation()
                }}>
                    <svg style={{
                        backgroundColor: "lightgray",
                        userSelect: "none",
                        width: requiredWidth,
                        height: requiredHeight,
                    }}>
                        <g>
                            {

                                internalEdges.map((e) => renderEdge(e, nodesPos))
                            }
                            {drawExtra && drawExtra(nodesPos, requiredHeight)}

                        </g>
                    </svg>
                    <div style={{
                        top: 0,
                        left: 0,
                        width: requiredWidth,
                        height: requiredHeight,
                        position: "absolute"
                    }}>
                        {nodes.map((node) => {
                            return renderNode(node, node.ref in nodesLayout ? nodesLayout[node.ref].x : 0, node.ref in nodesLayout ? nodesLayout[node.ref].y : 0, () => render(nodes, edges))
                        })}

                    </div>
                </div>
            </div>)
    } else {
        //
        return (
            <div>
                <div style={{
                    width: stageWidth,
                    height: stageHeight,
                    borderColor: "black",
                    borderWidth: 2,
                    backgroundColor: "lightgray",
                    overflowY: "clip",
                    overflowX: "clip",
                    transform: "translateZ(0)"
                }} onMouseUp={handleMouseUp} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                     onWheel={handleWheel} onMouseLeave={handleMouseUp}>

                    <svg style={{
                        transform: offsetString,
                        width: requiredWidth,
                        height: requiredHeight,
                        backgroundColor: "lightgray",
                        userSelect: "none",
                        top: 0,
                        left: 0,
                        position: "absolute"
                    }}>
                        <g>
                            {

                                internalEdges.map((e) => renderEdge(e, nodesPos))
                            }
                            {drawExtra && drawExtra(nodesPos, requiredHeight)}
                        </g>
                    </svg>
                    <div style={{
                        transform: offsetString,
                        width: requiredWidth,
                        height: requiredHeight,
                        top: 0,
                        left: 0,
                        position: "absolute",
                        overflowY: "hidden",
                        overflowX: "hidden",
                        userSelect: "none"
                    }}>
                        {nodes.map((node) => {
                            return renderNode(node, node.ref in nodesLayout ? nodesLayout[node.ref].x : 0, node.ref in nodesLayout ? nodesLayout[node.ref].y : 0)
                        })}

                    </div>
                </div>
            </div>
        );
    }

})