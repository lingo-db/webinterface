import './App.css';
import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Container, Form, Navbar, Row, Tab, Tabs} from 'react-bootstrap';
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer";
import {TraceViewer} from "@lingodb/common/TraceViewer";
import {analyzeLayers, getBaseReference, goUp} from "@lingodb/common/MLIRLayerAnalysis";
import {SubOpPlanViewer} from "@lingodb/common/SubOpPlanViewer";
import {PerfSymbolTable} from "./PerfSymbolTable";
import {PerfAsmViewer} from "./PerfAsmViewer";

const App = () => {
    const [data, setData] = useState(null);
    const [relalgMLIRData, setRelalgMLIRData] = useState(null);
    const [subopMLIRData, setSubOpMLIRData] = useState(null);
    const [llvmMLIRData, setLlvmMLIRData] = useState(null);
    const [imperativeMLIRData, setImperativeMLIRData] = useState(null);
    const [hasTrace, setHasTrace] = useState(false);
    const [hasPlan, setHasPlan] = useState(false);
    const [hasSubOpPlan, setHasSubOpPlan] = useState(false);
    const [hasPerf, setHasPerf] = useState(false);

    const [perfSymbols, setPerfSymbols] = useState(null);
    const [hasLayers, setHasLayers] = useState(false);
    const [layerInfo, setLayerInfo] = useState(undefined)
    const [selectedOps, setSelectedOps] = useState([]);
    const [selectedLLVMOps, setSelectedLLVMOps] = useState([]);
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                console.log(json)
                setData(json);
            } catch (error) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    };


    const [relalgBaseRef, setRelalgBaseRef] = useState(null);
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
                    const newRelAlgBaseRef = getBaseReference(relalgModule.passInfo.file)
                    setRelalgBaseRef(newRelAlgBaseRef)
                    if (data.perf) {

                        setHasPerf(true)
                        let totalSamples = data.perf.overview.reduce((a, c) => a + c.samples, 0)
                        let localPerfSymbols = data.perf.overview.map((r) => {
                            return {...r, percentage: r.samples / totalSamples, symbol: r.symbol.substring(0, 100)}
                        })
                        localPerfSymbols.sort((a, b) => b.percentage - a.percentage)
                        setPerfSymbols(localPerfSymbols)
                        console.log(data.perf.generated)

                    }
                }
            }
        }
        ,
        [data]
    )

    const handleTraceSelect = (trace) => {
        if (trace.category === "Execution" && trace.name === "Step" && hasLayers) {
            console.log(trace.extra.location)
            setSelectedOps(goUp(trace.extra.location, relalgBaseRef, layerInfo))
        }
    }

    const handleUnloadData = () => {
        setData(null);
        setSelectedOps([])
        setRelalgMLIRData(null)
        setLayerInfo(null)
        setRelalgBaseRef(null)
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
            setSelectedLLVMOps([instr.loc])
        }
        setActiveRightTab("mlir_llvm")
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
            </Navbar>
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
                            <Tab eventKey="queryPlan" title="Query-Plan">

                            </Tab>
                            <Tab eventKey="subopPlan" title="SubOp-Visualization">
                            </Tab>
                            <Tab eventKey="perf" title="Perf">
                            </Tab>
                        </Tabs>
                        <div style={{
                            visibility: activeLeftTab === "queryPlan" ? "visible" : "hidden",
                            position: 'absolute'
                        }}>
                            {hasPlan &&
                                <RelationalPlanViewer height={2 * (window.innerHeight - 90) / 3}
                                                      width={(window.innerWidth - 100) / 2}
                                                      input={data.plan}
                                                      onOperatorSelect={(id) => setSelectedOps([id])}
                                                      selectedOps={selectedOps}></RelationalPlanViewer>}
                        </div>
                        <div style={{
                            visibility: activeLeftTab === "subopPlan" ? "visible" : "hidden",
                            position: 'absolute'
                        }}>
                            {hasSubOpPlan &&
                                <SubOpPlanViewer height={2 * (window.innerHeight - 90) / 3}
                                                 width={(window.innerWidth - 100) / 2}
                                                 input={data.subopplan} onOperatorSelect={(id) => {
                                }}
                                                 selectedOps={[]}></SubOpPlanViewer>}
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
                        {hasLayers && <div><Tabs activeKey={activeRightTab} onSelect={handleRightTabSelect}>
                            <Tab eventKey="mlir_relalg" title="RelAlg">
                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={relalgMLIRData} selectedOps={selectedOps}></MLIRViewer>
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
                                visibility: activeRightTab === "mlir_relalg" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={relalgMLIRData} selectedOps={selectedOps}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_subop" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={subopMLIRData} selectedOps={[]}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_imperative" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={imperativeMLIRData} selectedOps={[]}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_llvm" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={llvmMLIRData} selectedOps={selectedLLVMOps}
                                            perfInfo={data.perf.generated}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "asm" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>
                                {hasPerf && <PerfAsmViewer height={2 * (window.innerHeight - 90) / 3}
                                                           width={(window.innerWidth - 100) / 2}
                                                           data={data.perf.generated}
                                                           onInstrClick={handleInstrClick}></PerfAsmViewer>}
                            </div>
                        </div>
                        }
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
export default App;
