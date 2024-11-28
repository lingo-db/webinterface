import dagre from "@dagrejs/dagre";
import React, {memo, useEffect, useLayoutEffect, useState} from "react";

export const PlanViewer = memo(({nested, height, width, nodes, edges, renderNode, renderEdge, onRendered, drawExtra}) => {

    //dagre.layout(g);
    const [internalEdges, setInternalEdges] = useState([])


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
    useEffect(() => {
        setOffsetString(`translate(${xOffset}px, ${yOffset}px) scale(${scale})`);
    }, [xOffset, yOffset, scale]);

    const [nodesLayout, setNodesLayout] = useState({})
    const [nodesPos, setNodesPos] = useState(undefined)

    const render = (nodes, edges) => {
        const g = new dagre.graphlib.Graph().setGraph({nodesep: 30, ranksep: 20,marginy:nested? 20:0, marginx:nested?10:0});
        nodes.forEach((node) => {
            const element = document.getElementById(`plan-${node.ref}`)
            const nodeWidth = element.offsetWidth
            const nodeHeight = element.offsetHeight
            g.setNode(node.ref, {width: nodeWidth, height: nodeHeight});
        })
        edges.forEach((edge) => {
            g.setEdge(edge[0], edge[1], edge[2])
        })
        dagre.layout(g);
        let newNodesLayout = {}
        let newNodesPos={}
        g.nodes().forEach((nodeId) => {
            let node = g.node(nodeId);
            if (node ===undefined){
                console.log("unknown node", nodeId, JSON.stringify(nodeId))
            }
            newNodesLayout[nodeId] = {
                x: node.x - node.width / 2,
                y: node.y - node.height / 2,
                width: node.width,
                height: node.height
            }
            newNodesPos[nodeId] ={
                computedX: node.x,
                computedY: node.y,
                renderX: node.x - node.width / 2,
                renderY: node.y - node.height / 2,
            }
        })
        setNodesPos(newNodesPos)
        let maxX = g.nodes().reduce((maxX, nodeId) => {
            return Math.max(maxX, newNodesLayout[nodeId].x)
        }, 0)
        let maxY = g.nodes().reduce((maxY, nodeId) => {
            return Math.max(maxY, newNodesLayout[nodeId].y)
        }, 0)
        setNodesLayout(newNodesLayout)
        let newEdges = []
        g.edges().forEach((edgeId) => {
            let edge = g.edge(edgeId);
            newEdges.push({
                id: edgeId,
                points: edge.points,
                label: edge.label,
                cardinality: edge.cardinality,
                estimatedCardinality: edge.estimatedCardinality,
                type: edge.type,
                meta: edge.meta
            })
        })
        setInternalEdges(newEdges)
        const requiredWidth = g.nodes().reduce((maxWidth, nodeId) => {
            let node = g.node(nodeId);
            return Math.max(maxWidth, node.x + node.width/2);
        }, 0)+ (nested?10:0);
        const requiredHeight = g.nodes().reduce((maxHeight, nodeId) => {
            let node = g.node(nodeId);
            return Math.max(maxHeight, node.y + node.height/2);
        }, 0)+(nested? 20:0);
        setRequiredWidth(requiredWidth)
        setRequiredHeight(requiredHeight)
        const newScale = Math.min(stageWidth / requiredWidth, stageHeight / requiredHeight)
        setScale(newScale)
        setXOffset(-(requiredWidth - requiredWidth * newScale) / 2)
        setYOffset(-(requiredHeight - requiredHeight * newScale) / 2)


    }
    useEffect(() => {
        render(nodes, edges)
        setTimeout(()=>render(nodes,edges),500)
        setTimeout(()=>render(nodes,edges),1000)
    }, [nodes, edges])


    if (nested) {
        return (
            <div>
                <div style={{
                    backgroundColor: "lightgray",
                    position:"relative",
                }}>
                    <svg style={{
                        backgroundColor: "lightgray",
                        userSelect: "none",
                        width: requiredWidth,
                        height: requiredHeight,
                    }}>
                        <g>
                            {

                                internalEdges.map((e)=>renderEdge(e,nodesPos))
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
                            return renderNode(node, node.ref in nodesLayout ? nodesLayout[node.ref].x : 0, node.ref in nodesLayout ? nodesLayout[node.ref].y : 0, ()=>render(nodes, edges))
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
                        top:0,
                        left:0,
                        position:"absolute"
                    }}>
                        <g>
                            {

                                internalEdges.map((e)=>renderEdge(e,nodesPos))
                            }
                            {drawExtra && drawExtra(nodesPos,requiredHeight)}
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