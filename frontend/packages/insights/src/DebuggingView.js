import React, {useEffect, useMemo, useRef, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {
    Button,
    ButtonGroup,
    CloseButton,
    Col,
    Container, Dropdown,
    DropdownButton,
    Form,
    Nav,
    Navbar,
    Row
} from 'react-bootstrap';
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer";
import {
    analyzeLayers,
    collectChildrenWithData,
    getBaseReference,
    goDown,
    goDownDirect,
    goUp, goUpDirect, opSameExceptLocAndChildren
} from "@lingodb/common/MLIRLayerAnalysis";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {HIGHLIGHT_COLORS} from "@lingodb/common/HighlightUtils";
export const DebuggingView = ({data, onClose}) => {
    const [viewMode, setViewMode] = useState("SideBySide")
    // selections: array of {op, layer, color} — one entry per color
    const [selections, setSelections] = useState([])
    const [leftDiffIndex, setLeftDiffIndex] = useState(null);
    const [rightDiffIndex, setRightDiffIndex] = useState(null);
    const [showDiff, setShowDiff] = useState(false);
    const [layerInfo, setLayerInfo] = useState(undefined)
    const [relalgMLIRData, setRelalgMLIRData] = useState(null);

    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value)
    const highlightColorRef = useRef(HIGHLIGHT_COLORS[0].value)
    const handleColorChange = (color) => {
        setHighlightColor(color)
        highlightColorRef.current = color
    }
    const addSelection = (op, layer) => {
        const color = highlightColorRef.current
        setSelections(prev => [
            ...prev.filter(s => s.color !== color),
            {op, layer, color}
        ])
    }
    useEffect(() => {
            if (data == null) {
                setLayerInfo(null)
            } else {
                data.layers.forEach((layer, index) => {
                    layer.index = index
                })
                const relalgModule = data.layers[data.layers.findIndex((layer) => layer.passInfo.argument === "relalg-introduce-tmp") + 1]
                setRelalgMLIRData(relalgModule)
                let newLayerInfo = analyzeLayers(data.layers)
                setLayerInfo(newLayerInfo)
            }
        }
        ,
        [data]
    )

    // Derive layer data synchronously
    const leftDiffData = useMemo(() => {
        if (data && leftDiffIndex != null) return data.layers[leftDiffIndex]
        return null
    }, [data, leftDiffIndex])
    const rightDiffData = useMemo(() => {
        if (data && rightDiffIndex != null) return data.layers[rightDiffIndex]
        return null
    }, [data, rightDiffIndex])

    // Compute diff backgrounds reactively
    const {leftDiffBackground, rightDiffBackground} = useMemo(() => {
        if (!showDiff || !data || leftDiffIndex == null || rightDiffIndex == null || !layerInfo) {
            return {leftDiffBackground: null, rightDiffBackground: null}
        }
        let leftChildren = []
        let rightChildren = []
        let leftBackground = {}
        let rightBackground = {}
        collectChildrenWithData(data.layers[leftDiffIndex].parsed, leftChildren)
        collectChildrenWithData(data.layers[rightDiffIndex].parsed, rightChildren)
        let leftOps = {}
        let rightOps = {}
        leftChildren.forEach((op) => {
            leftOps[op.id] = op
        })
        rightChildren.forEach((op) => {
            rightOps[op.id] = op
        })
        let leftDiffBaseRef = getBaseReference(data.layers[leftDiffIndex].passInfo.file)
        let rightDiffBaseRef = getBaseReference(data.layers[rightDiffIndex].passInfo.file)

        let valueMapping = []

        leftChildren.forEach((op) => {
            if (op && op.id) {
                const related = goDownDirect(op.id, rightDiffBaseRef, layerInfo)
                if (related.length === 0) {
                    leftBackground[op.id] = "lightgray"
                }
                if (related.length === 1) {
                    const same = opSameExceptLocAndChildren(leftOps[op.id], rightOps[related[0]], valueMapping, true)
                    if (!same) {
                        leftBackground[op.id] = "#ffebba"
                    } else {
                        let leftResultGroup = leftOps[op.id].children[0]
                        let rightResultGroup = rightOps[related[0]].children[0]
                        if (leftResultGroup.type === "resultGroup" && rightResultGroup === "resultGroup") {
                            valueMapping[leftResultGroup.value] = rightResultGroup.value
                        }
                    }
                }
                if (related.length > 1) {
                    leftBackground[op.id] = "#ffbaf8"
                }
            }
        })
        rightChildren.forEach((op) => {
            if (op && op.id) {
                const related = goUpDirect(op.id, leftDiffBaseRef, layerInfo)
                if (related.length === 0) {
                    rightBackground[op.id] = "lightgray"
                }
                if (related.length === 1) {
                    const same = opSameExceptLocAndChildren(leftOps[related[0]], rightOps[op.id], valueMapping, true)
                    if (!same) {
                        rightBackground[op.id] = "#ffebba"
                    } else {
                        rightBackground[op.id] = "white"
                    }
                }
                if (related.length > 1) {
                    rightBackground[op.id] = "#ffbaf8"
                }
            }
        })
        return {leftDiffBackground: leftBackground, rightDiffBackground: rightBackground}
    }, [showDiff, data, leftDiffIndex, rightDiffIndex, layerInfo])
    //return <TraceViewer></TraceViewer>
    const incAndSetLayer = (current, set) => {
        return () => {
            if (current < data.layers.length - 1) {
                set(current + 1)
            }
        }
    }
    const decAndSetLayer = (current, set) => {
        return () => {
            if (current > 0) {
                set(current - 1)
            }
        }
    }
    // Compute highlights for left diff layer from ALL selections
    const selectedLeftOps = useMemo(() => {
        if (selections.length === 0 || leftDiffIndex == null || !layerInfo || !data) return {}
        const ops = {}
        selections.forEach(sel => {
            if (sel.layer !== leftDiffIndex) {
                const baseRef = getBaseReference(data.layers[leftDiffIndex].passInfo.file)
                const relatedOps = sel.layer < leftDiffIndex ? goDown(sel.op, baseRef, layerInfo) : goUp(sel.op, baseRef, layerInfo)
                relatedOps.forEach(opId => { ops[opId] = sel.color })
            } else {
                ops[sel.op] = sel.color
            }
        })
        return ops
    }, [data, layerInfo, selections, leftDiffIndex])

    // Compute highlights for right diff layer from ALL selections
    const selectedRightOps = useMemo(() => {
        if (selections.length === 0 || rightDiffIndex == null || !layerInfo || !data) return {}
        const ops = {}
        selections.forEach(sel => {
            if (sel.layer !== rightDiffIndex) {
                const baseRef = getBaseReference(data.layers[rightDiffIndex].passInfo.file)
                const relatedOps = sel.layer < rightDiffIndex ? goDown(sel.op, baseRef, layerInfo) : goUp(sel.op, baseRef, layerInfo)
                relatedOps.forEach(opId => { ops[opId] = sel.color })
            } else {
                ops[sel.op] = sel.color
            }
        })
        return ops
    }, [data, layerInfo, selections, rightDiffIndex])

    // Compute highlights for relAlg layer from ALL selections
    const selectedRelAlgOps = useMemo(() => {
        if (selections.length === 0 || !relalgMLIRData || !layerInfo || !data) return {}
        const ops = {}
        selections.forEach(sel => {
            if (sel.layer !== relalgMLIRData.index) {
                const baseRef = getBaseReference(data.layers[relalgMLIRData.index].passInfo.file)
                const relatedOps = sel.layer < relalgMLIRData.index ? goDown(sel.op, baseRef, layerInfo) : goUp(sel.op, baseRef, layerInfo)
                relatedOps.forEach(opId => { ops[opId] = sel.color })
            } else {
                ops[sel.op] = sel.color
            }
        })
        return ops
    }, [data, layerInfo, relalgMLIRData, selections])
    const selectError = (index) => {
        console.log("select", index)
        let file= data.errors[index][0][0]
        let line= data.errors[index][0][1]
        let pass = data.layers.find((layer) => {
            if(layer.index===0){
                return false
            }
            return layer.passInfo.file.endsWith(file)
        })
        if(pass){
            setLeftDiffIndex(pass.index-1)
            setRightDiffIndex(pass.index)
            addSelection(file.split(".")[0]+":"+line, pass.index)
        }
    }
    const selectFile = (index) => {
        setLeftDiffIndex(index-1)
        setRightDiffIndex(index)
    }
    const handleRelAlgOpSelection = (op) => {
        addSelection(op, relalgMLIRData.index)
    }
    return (
        <div>

            <Navbar bg="light" fixed="top">
                <Nav className="ml-auto" style={{paddingLeft: 10}}>
                <Navbar.Brand href="#">Debugging</Navbar.Brand>
                </Nav>
                <Nav variant="pills" activeKey={viewMode} onSelect={setViewMode}>

                    <Nav.Item>
                        <Nav.Link eventKey="SideBySide">SideBySide</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="Plan">Query</Nav.Link>
                    </Nav.Item>
                </Nav>
                {viewMode==="SideBySide"&&<Nav className="ml-auto" style={{paddingLeft: 10}}>
                    <Nav.Item><Nav.Link href={"#"}>Navigate to Operation:</Nav.Link></Nav.Item>
                    <DropdownButton as={ButtonGroup} id="dropdown-basic-button" title={"Error"} onSelect={selectError}>
                        {data.errors.map((e, index) => {
                            return <Dropdown.Item eventKey={index}>{e}</Dropdown.Item>
                        })
                        }
                    </DropdownButton>
                    <DropdownButton as={ButtonGroup} id="dropdown-basic-button" title={"File"} onSelect={selectFile}>
                        {data.layers.filter((l)=>l.index>0).map((l, index) => {
                            return <Dropdown.Item eventKey={l.index}>{l.passInfo.file}</Dropdown.Item>
                        })
                        }
                    </DropdownButton>
                    <Nav.Item><Nav.Link href={"#"}>Actions:</Nav.Link></Nav.Item>

                    {leftDiffData && rightDiffData &&  <Button onClick={() => setShowDiff(prev => !prev)} variant={showDiff ? "primary" : "outline-primary"}>Compute Diff</Button>}
                    <Dropdown style={{marginLeft: 8}}>
                        <Dropdown.Toggle variant="outline-secondary" size="sm">
                            <span style={{display: "inline-block", width: 12, height: 12, backgroundColor: highlightColor, border: "1px solid #999", marginRight: 4}}></span>
                            Highlight Color
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {HIGHLIGHT_COLORS.map(c => (
                                <Dropdown.Item key={c.value} onClick={() => handleColorChange(c.value)} active={highlightColor === c.value}>
                                    <span style={{display: "inline-block", width: 12, height: 12, backgroundColor: c.value, border: "1px solid #999", marginRight: 8}}></span>
                                    {c.label}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>

                </Nav>}

                <Nav className="ms-auto" style={{paddingRight: 10}}>
                    <Form>
                        <CloseButton onClick={onClose}/>
                    </Form>
                </Nav>



            </Navbar>

            {viewMode==="SideBySide"&&leftDiffData && rightDiffData && <Container fluid className="pt-5 mt-3">

                <Row>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                        <Navbar>
                            <Button onClick={decAndSetLayer(leftDiffIndex, setLeftDiffIndex)}>{"<"}</Button>
                            <Button onClick={() => setLeftDiffIndex(rightDiffIndex)}>Take Right</Button>
                            <Button onClick={incAndSetLayer(leftDiffIndex, setLeftDiffIndex)}>{">"}</Button>
                            After {leftDiffData.passInfo.argument} ({leftDiffData.passInfo.file})</Navbar>
                        <MLIRViewer height={(window.innerHeight - 140)}
                                    width={(window.innerWidth - 100) / 2}
                                    layer={leftDiffData} selectedOps={selectedLeftOps}
                                    backgroundMap={leftDiffBackground}
                                    onOpClick={(d) => {
                                        addSelection(d.id, leftDiffIndex)
                                    }}></MLIRViewer>
                    </Col>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                        <Navbar>
                            <Button onClick={decAndSetLayer(rightDiffIndex, setRightDiffIndex)}>{"<"}</Button>
                            <Button onClick={() => setRightDiffIndex(leftDiffIndex)}>Take Left</Button>
                            <Button onClick={incAndSetLayer(rightDiffIndex, setRightDiffIndex)}>{">"}</Button>
                            After {rightDiffData.passInfo.argument} ({rightDiffData.passInfo.file})</Navbar>
                        <MLIRViewer height={(window.innerHeight - 140)}
                                    width={(window.innerWidth - 100) / 2}
                                    layer={rightDiffData} selectedOps={selectedRightOps}
                                    backgroundMap={rightDiffBackground}
                                    onOpClick={(d) => {
                                        addSelection(d.id, rightDiffIndex)
                                    }}></MLIRViewer>
                    </Col>
                </Row>
            </Container>}
            {viewMode==="Plan"&&data.plan&&<Container fluid className="pt-5 mt-3">
                <Row>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                        <RelationalPlanViewer height={window.innerHeight - 90}
                                              width={(window.innerWidth - 100) / 2}
                                              input={data.plan}
                                              onOperatorSelect={handleRelAlgOpSelection}
                                              selectedOps={selectedRelAlgOps}></RelationalPlanViewer>
                    </Col>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa', maxHeight: (window.innerHeight-90), overflowY:"scroll"}}>
                        <SyntaxHighlighter language="sql" style={dracula}>
                            {data.sql}
                        </SyntaxHighlighter>
                    </Col>
                </Row>
            </Container>}
        </div>
    );
}
