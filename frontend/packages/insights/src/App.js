import './App.css';
import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Container, Form, Navbar, Row, Tab, Tabs} from 'react-bootstrap';
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer";
import {TraceViewer} from "@lingodb/common/TraceViewer";
import {analyzeLayers, getBaseReference, goDown, goUp} from "@lingodb/common/MLIRLayerAnalysis";
import {SubOpPlanViewer} from "@lingodb/common/SubOpPlanViewer";
import {PerfSymbolTable} from "./PerfSymbolTable";
import {PerfAsmViewer} from "./PerfAsmViewer";

const App = () => {
    const [data, setData] = useState(null);

    const [viewMode, setViewMode] = useState("overview")
    //which data parts are available
    const [hasTrace, setHasTrace] = useState(false);
    const [hasPlan, setHasPlan] = useState(false);
    const [hasSubOpPlan, setHasSubOpPlan] = useState(false);
    const [hasPerf, setHasPerf] = useState(false);
    const [hasLayers, setHasLayers] = useState(false);

    //mlir modules on different layers
    const [relalgMLIRData, setRelalgMLIRData] = useState(null);
    const [subopMLIRData, setSubOpMLIRData] = useState(null);
    const [imperativeMLIRData, setImperativeMLIRData] = useState(null);
    const [llvmMLIRData, setLlvmMLIRData] = useState(null);

    const [leftDiffIndex, setLeftDiffIndex] = useState(null);
    const [rightDiffIndex, setRightDiffIndex] = useState(null);
    const [leftDiffData, setLeftDiffData] = useState(null);
    const [rightDiffData, setRightDiffData] = useState(null);


    //aggregated perf data (file,symbol) -> percentage
    const [perfSymbols, setPerfSymbols] = useState(null);

    //cached "graph", to find origin of ops or dependent ops
    const [layerInfo, setLayerInfo] = useState(undefined)


    //selected ops accross different layers
    const [selectedOp, setSelectedOp] = useState(null)
    const [selectedLayer, setSelectedLayer] = useState(null)
    const [selectedRelAlgOps, setSelectedRelAlgOps] = useState([]);
    const [selectedSubOpOps, setSelectedSubOpOps] = useState([]);
    const [selectedImperativeOps, setSelectedImperativeOps] = useState([]);
    const [selectedLLVMOps, setSelectedLLVMOps] = useState([]);
    const [selectedLeftOps, setSelectedLeftOps] = useState([]);
    const [selectedRightOps, setSelectedRightOps] = useState([]);


    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                setData(json);
            } catch (error) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    };


    useEffect(() => {
            if (data == null) {
                setRelalgMLIRData(null)
                setHasTrace(false)
                setHasPlan(false)
                setHasSubOpPlan(false)
                setHasPerf(false)
                setHasLayers(false)
            } else {
                if (data.fileType === "traceOnly") {
                    setHasTrace(true)
                    setHasPlan(false)
                    setHasSubOpPlan(false)
                    setHasPerf(false)

                    setHasLayers(false)
                } else if (data.fileType === "insights") {
                    setHasTrace(true)
                    setHasPlan(true)
                    setHasLayers(true)
                    setHasSubOpPlan(true)
                }
                if (data.fileType === "insights") {
                    data.layers.forEach((layer, index) => {
                        layer.index = index
                    })
                    const relalgModule = data.layers[data.layers.findIndex((layer) => layer.passInfo.argument === "relalg-introduce-tmp") + 1]
                    const subopModule = data.layers[data.layers.findIndex((layer) => layer.passInfo.argument === "subop-prepare-lowering")]
                    const imperativeModule = data.layers[data.layers.findIndex((layer) => layer.passInfo.argument === "subop-prepare-lowering") + 1]
                    const llvmModule = data.layers[data.layers.length - 1]
                    setImperativeMLIRData(imperativeModule)
                    setLlvmMLIRData(llvmModule)
                    setRelalgMLIRData(relalgModule)
                    setSubOpMLIRData(subopModule)
                    let newLayerInfo = analyzeLayers(data.layers)
                    setLayerInfo(newLayerInfo)
                    if (data.perf) {

                        setHasPerf(true)
                        let totalSamples = data.perf.overview.reduce((a, c) => a + c.samples, 0)
                        let localPerfSymbols = data.perf.overview.map((r) => {
                            return {...r, percentage: r.samples / totalSamples, symbol: r.symbol.substring(0, 100)}
                        })
                        localPerfSymbols.sort((a, b) => b.percentage - a.percentage)
                        setPerfSymbols(localPerfSymbols)

                    }
                }
            }
        }
        ,
        [data]
    )
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

    useEffect(() => {
        if (selectedOp && selectedLayer) {
            const displayedLayers = [{idx: relalgMLIRData.index, fn: setSelectedRelAlgOps}, {
                idx: subopMLIRData.index,
                fn: setSelectedSubOpOps
            }, {idx: imperativeMLIRData.index, fn: setSelectedImperativeOps}, {
                idx: llvmMLIRData.index,
                fn: setSelectedLLVMOps
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
    }, [selectedOp, selectedLayer])
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
    }, [selectedOp, selectedLayer, leftDiffIndex, rightDiffIndex])
    const handleSubOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(subopMLIRData.index)
        setLeftDiffIndex(subopMLIRData.index - 1)
        setRightDiffIndex(subopMLIRData.index)
    }
    const handleRelAlgOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(relalgMLIRData.index)
        setLeftDiffIndex(relalgMLIRData.index - 1)
        setRightDiffIndex(relalgMLIRData.index)
    }
    const handleLLVMOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(llvmMLIRData.index)
        setLeftDiffIndex(llvmMLIRData.index - 1)
        setRightDiffIndex(llvmMLIRData.index)
    }
    const handleTraceSelect = (trace) => {
        if (trace.category === "Execution" && trace.name === "Step" && hasLayers) {
            handleSubOpSelection(trace.extra.location)
        }
    }

    const handleUnloadData = () => {
        setData(null);
        setSelectedRelAlgOps([])
        setSelectedSubOpOps([])
        setSelectedImperativeOps([])
        setRelalgMLIRData(null)
        setLayerInfo(null)
        setHasTrace(false)
        setHasPlan(false)
        setHasSubOpPlan(false)
        setHasLayers(false)

    };

    const [activeLeftTab, setActiveLeftTab] = useState("queryPlan")
    const [activeRightTab, setActiveRightTab] = useState("mlir_relalg")
    const handleLeftTabSelect = (selectedTab) => {
        setActiveLeftTab(selectedTab)
    }
    const handleRightTabSelect = (selectedTab) => {
        setActiveRightTab(selectedTab)
    }
    const handleInstrClick = (instr) => {
        if (instr.loc) {
            console.log("selected llvm", [instr.loc])
            const op = instr.loc
            handleLLVMOpSelection(op)

        }
        setActiveRightTab("mlir_llvm")
    }

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
    //return <TraceViewer></TraceViewer>
    return (
        <div>

            <Navbar bg="dark" variant="dark" fixed="top">
                <Navbar.Brand href="#">Logo</Navbar.Brand>
                <Form className="ml-auto">
                    {data ? (
                        <Button variant="danger" onClick={handleUnloadData}>
                            Unload Data
                        </Button>
                    ) : (
                        <Form.Control
                            type="file"
                            id="custom-file"
                            label="Upload JSON"
                            custom
                            onChange={handleFileUpload}
                        />
                    )}
                </Form>
                {viewMode === "overview" && <Button onClick={() => setViewMode("diff")}
                                                    disabled={!(leftDiffData && rightDiffData)}>Diff</Button>}
                {viewMode === "diff" && <Button onClick={() => setViewMode("overview")}>Overview</Button>}

            </Navbar>
            <div style={{
                visibility: viewMode === "overview" ? "visible" : "hidden",
            }}>
                <Container fluid className="pt-5 mt-3">
                    <Row>
                        <Col className="p-3"
                             style={{height: (window.innerHeight - 80) / 3, backgroundColor: '#f8f9fa'}}>
                            {hasTrace &&
                                <TraceViewer height={(window.innerHeight - 80) / 3} width={window.innerWidth - 20}
                                             traceData={data.trace} onSelect={handleTraceSelect}></TraceViewer>}
                        </Col>
                    </Row>
                    <Row>
                        <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                            <Tabs activeKey={activeLeftTab} onSelect={handleLeftTabSelect}>
                                {hasPlan && <Tab eventKey="queryPlan" title="Query-Plan">

                                </Tab>}
                                {hasSubOpPlan && <Tab eventKey="subopPlan" title="SubOp-Visualization">
                                </Tab>}
                                {hasPerf && <Tab eventKey="perf" title="Perf">
                                </Tab>}
                            </Tabs>
                            <div style={{
                                visibility: activeLeftTab === "queryPlan" && viewMode === "overview" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>
                                {hasPlan &&
                                    <RelationalPlanViewer height={2 * (window.innerHeight - 90) / 3}
                                                          width={(window.innerWidth - 100) / 2}
                                                          input={data.plan}
                                                          onOperatorSelect={(id) => handleRelAlgOpSelection(id)}
                                                          selectedOps={selectedRelAlgOps}></RelationalPlanViewer>}
                            </div>
                            <div style={{
                                visibility: activeLeftTab === "subopPlan" && viewMode === "overview" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>
                                {hasSubOpPlan &&
                                    <SubOpPlanViewer height={2 * (window.innerHeight - 90) / 3}
                                                     width={(window.innerWidth - 100) / 2}
                                                     input={data.subopplan} onOperatorSelect={(id) => {
                                        handleSubOpSelection(id)
                                    }}
                                                     selectedOps={selectedSubOpOps}></SubOpPlanViewer>}
                            </div>
                            <div style={{
                                visibility: activeLeftTab === "perf" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>
                                {hasPerf &&
                                    <PerfSymbolTable data={perfSymbols}/>}
                            </div>

                        </Col>
                        <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                            {hasLayers && viewMode === "overview" &&
                                <div><Tabs activeKey={activeRightTab} onSelect={handleRightTabSelect}>
                                    <Tab eventKey="mlir_relalg" title="RelAlg">
                                    </Tab>
                                    <Tab eventKey="mlir_subop" title="SubOp">

                                    </Tab>
                                    <Tab eventKey="mlir_imperative" title="Imperative">

                                    </Tab>
                                    <Tab eventKey="mlir_llvm" title="LLVM">

                                    </Tab>
                                    {hasPerf && <Tab eventKey="asm" title="ASM">

                                    </Tab>}
                                </Tabs>
                                    <div style={{
                                        visibility: activeRightTab === "mlir_relalg" && viewMode === "overview" ? "visible" : "hidden",
                                        position: 'absolute'
                                    }}>

                                        <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                                    width={(window.innerWidth - 100) / 2}
                                                    layer={relalgMLIRData} selectedOps={selectedRelAlgOps}
                                                    onOpClick={(d) => handleRelAlgOpSelection(d.id)}></MLIRViewer>
                                    </div>
                                    <div style={{
                                        visibility: activeRightTab === "mlir_subop" && viewMode === "overview" ? "visible" : "hidden",
                                        position: 'absolute'
                                    }}>

                                        <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                                    width={(window.innerWidth - 100) / 2}
                                                    layer={subopMLIRData} selectedOps={selectedSubOpOps}
                                                    onOpClick={(d) => handleSubOpSelection(d.id)}></MLIRViewer>
                                    </div>
                                    <div style={{
                                        visibility: activeRightTab === "mlir_imperative" ? "visible" : "hidden",
                                        position: 'absolute'
                                    }}>

                                        <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                                    width={(window.innerWidth - 100) / 2}
                                                    layer={imperativeMLIRData} selectedOps={selectedImperativeOps}
                                                    onOpClick={(d) => {
                                                    }}></MLIRViewer>
                                    </div>
                                    <div style={{
                                        visibility: activeRightTab === "mlir_llvm" ? "visible" : "hidden",
                                        position: 'absolute'
                                    }}>

                                        <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                                    width={(window.innerWidth - 100) / 2}
                                                    layer={llvmMLIRData} selectedOps={selectedLLVMOps}
                                                    onOpClick={(d) => handleLLVMOpSelection(d.id)}
                                                    perfInfo={data.perf.generated}></MLIRViewer>
                                    </div>
                                    <div style={{
                                        visibility: activeRightTab === "asm" ? "visible" : "hidden",
                                        position: 'absolute'
                                    }}>
                                        {hasPerf && <PerfAsmViewer height={2 * (window.innerHeight - 90) / 3}
                                                                   width={(window.innerWidth - 100) / 2}
                                                                   data={data.perf.generated}
                                                                   onInstrClick={handleInstrClick}
                                                                   selectedLLVMOps={selectedLLVMOps}></PerfAsmViewer>}
                                    </div>
                                </div>
                            }
                        </Col>
                    </Row>
                </Container>
            </div>
            <div style={{
                visibility: viewMode === "diff" ? "visible" : "hidden",
            }}>
                {leftDiffData && rightDiffData && viewMode==="diff"&&<Container fluid className="pt-5 mt-3">

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
                                        onOpClick={(d) => {setSelectedOp(d.id);setSelectedLayer(rightDiffIndex)}}></MLIRViewer>
                        </Col>
                        <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                            <Navbar>
                                <Button onClick={decAndSetLayer(rightDiffIndex,setRightDiffIndex)}>{"<"}</Button>
                                <Button onClick={()=>setRightDiffIndex(leftDiffIndex)}>Take Left</Button>
                                <Button onClick={incAndSetLayer(rightDiffIndex, setRightDiffIndex)}>{">"}</Button>
                                After {rightDiffData.passInfo.argument} ({rightDiffData.passInfo.file})</Navbar>
                            <MLIRViewer height={(window.innerHeight - 140)}
                                        width={(window.innerWidth - 100) / 2}
                                        layer={rightDiffData} selectedOps={selectedRightOps}
                                        onOpClick={(d) => {setSelectedOp(d.id);setSelectedLayer(rightDiffIndex)}}></MLIRViewer>
                        </Col>
                    </Row>
                </Container>}
            </div>
        </div>
    );
}
export default App;
