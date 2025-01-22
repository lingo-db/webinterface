import React, {useEffect, useState} from "react";
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
export const DebuggingView = ({data, onClose}) => {
    const [viewMode, setViewMode] = useState("Plan")
    const [selectedOp, setSelectedOp] = useState(null)
    const [selectedLayer, setSelectedLayer] = useState(null)
    const [leftDiffIndex, setLeftDiffIndex] = useState(null);
    const [rightDiffIndex, setRightDiffIndex] = useState(null);
    const [leftDiffData, setLeftDiffData] = useState(null);
    const [rightDiffData, setRightDiffData] = useState(null);
    const [leftDiffBackground, setLeftDiffBackground] = useState(null);
    const [rightDiffBackground, setRightDiffBackground] = useState(null);
    const [layerInfo, setLayerInfo] = useState(undefined)
    const [selectedRelAlgOps, setSelectedRelAlgOps] = useState([]);
    const [relalgMLIRData, setRelalgMLIRData] = useState(null);


    const [selectedLeftOps, setSelectedLeftOps] = useState([]);
    const [selectedRightOps, setSelectedRightOps] = useState([]);
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

    const createDiff = () => {
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
                console.log(op.id, "related", related)
                if (related.length === 0) {
                    leftBackground[op.id] = "lightgray"
                }
                if (related.length === 1) {
                    const same = opSameExceptLocAndChildren(leftOps[op.id], rightOps[related[0]], valueMapping, true)
                    console.log("compare", leftOps[op.id], rightOps[related[0]], same)
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
                console.log(op.id, "related", related)
                if (related.length === 0) {
                    rightBackground[op.id] = "lightgray"
                }
                if (related.length === 1) {
                    const same = opSameExceptLocAndChildren(leftOps[related[0]], rightOps[op.id], valueMapping, true)
                    console.log("compare", rightOps[op.id], leftOps[related[0]], same)
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
        setLeftDiffBackground(leftBackground)
        setRightDiffBackground(rightBackground)
        console.log("left", leftBackground)
    }
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
    useEffect(() => {
        if (selectedOp && selectedLayer) {
            const displayedLayers = [{idx: leftDiffIndex, fn: setSelectedLeftOps}, {
                idx: rightDiffIndex,
                fn: setSelectedRightOps
            }]
            displayedLayers.forEach((l) => {
                if (l.idx && selectedLayer !== l.idx) {
                    const baseRef = getBaseReference(data.layers[l.idx].passInfo.file)
                    console.log("baseRef", baseRef, "goingDown", selectedLayer < l.idx, selectedLayer, l.index)
                    const relatedOps = selectedLayer < l.idx ? goDown(selectedOp, baseRef, layerInfo) : goUp(selectedOp, baseRef, layerInfo)
                    l.fn(relatedOps)
                } else if (l.idx) {
                    l.fn([selectedOp])
                }
            })
        }
    }, [data,layerInfo, selectedOp, selectedLayer, leftDiffIndex, rightDiffIndex])

    useEffect(() => {
        if (selectedOp && selectedLayer) {
            const displayedLayers = [{idx: relalgMLIRData.index, fn: setSelectedRelAlgOps}]
            displayedLayers.forEach((l) => {
                if (l.idx && selectedLayer !== l.idx) {
                    const baseRef = getBaseReference(data.layers[l.idx].passInfo.file)
                    console.log("baseRef", baseRef, "goingDown", selectedLayer < l.idx, selectedLayer, l.index)
                    const relatedOps = selectedLayer < l.idx ? goDown(selectedOp, baseRef, layerInfo) : goUp(selectedOp, baseRef, layerInfo)
                    l.fn(relatedOps)
                } else if (l.idx) {
                    l.fn([selectedOp])
                }
            })
        }
    }, [data, layerInfo,relalgMLIRData, selectedOp, selectedLayer])
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
            setSelectedLayer(pass.index)
            setSelectedOp(file.split(".")[0]+":"+line)
        }
    }
    useEffect(() => {
        if (data && leftDiffIndex) {
            setLeftDiffData(data.layers[leftDiffIndex])
        }
    }, [leftDiffIndex, data])
    useEffect(() => {
        if (data && rightDiffIndex) {
            setRightDiffData(data.layers[rightDiffIndex])
        }
    }, [rightDiffIndex, data])
    const selectFile = (index) => {
        setLeftDiffIndex(index-1)
        setRightDiffIndex(index)
    }
    const handleRelAlgOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(relalgMLIRData.index)
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

                    {leftDiffData && rightDiffData &&  <Button onClick={() => createDiff()}>Compute Diff</Button>}

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
                                        setSelectedOp(d.id);
                                        setSelectedLayer(leftDiffIndex)
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
                                        setSelectedOp(d.id);
                                        setSelectedLayer(rightDiffIndex)
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
