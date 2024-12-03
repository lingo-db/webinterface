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

    //aggregated perf data (file,symbol) -> percentage
    const [perfSymbols, setPerfSymbols] = useState(null);

    //cached "graph", to find origin of ops or dependent ops
    const [layerInfo, setLayerInfo] = useState(undefined)


    //selected ops accross different layers
    const [selectedRelAlgOps, setSelectedRelAlgOps] = useState([]);
    const [selectedSubOpOps, setSelectedSubOpOps] = useState([]);
    const [selectedImperativeOps, setSelectedImperativeOps] = useState([]);
    const [selectedLLVMOps, setSelectedLLVMOps] = useState([]);


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
                        console.log(data.perf.generated)

                    }
                }
            }
        }
        ,
        [data]
    )
    const handleSubOpSelection=(op)=>{
        setSelectedSubOpOps([op])
        const relalgBaseRef=getBaseReference(relalgMLIRData.passInfo.file)
        const impBaseRef=getBaseReference(imperativeMLIRData.passInfo.file)
        const llvmBaseRef=getBaseReference(llvmMLIRData.passInfo.file)
        const relatedRelalgOps=goUp(op, relalgBaseRef, layerInfo)
        const relatedImpOps=goDown(op, impBaseRef, layerInfo)
        const relatedLLVMOps=goDown(op, llvmBaseRef, layerInfo)
        setSelectedRelAlgOps(relatedRelalgOps)
        setSelectedImperativeOps(relatedImpOps)
        setSelectedLLVMOps(relatedLLVMOps)
    }
    const handleRelAlgOpSelection=(op)=>{
        setSelectedRelAlgOps([op])
        const subOpBaseRef=getBaseReference(subopMLIRData.passInfo.file)
        const impBaseRef=getBaseReference(imperativeMLIRData.passInfo.file)
        const llvmBaseRef=getBaseReference(llvmMLIRData.passInfo.file)
        const relatedSubOps=goDown(op, subOpBaseRef, layerInfo)
        const relatedImpOps=goDown(op, impBaseRef, layerInfo)
        const relatedLLVMOps=goDown(op, llvmBaseRef, layerInfo)
        setSelectedSubOpOps(relatedSubOps)
        setSelectedImperativeOps(relatedImpOps)
        setSelectedLLVMOps(relatedLLVMOps)
    }
    const handleLLVMOpSelection=(op)=>{
        setSelectedLLVMOps([op])
        const relalgBaseRef=getBaseReference(relalgMLIRData.passInfo.file)
        const subOpBaseRef=getBaseReference(subopMLIRData.passInfo.file)
        const impBaseRef=getBaseReference(imperativeMLIRData.passInfo.file)
        const relatedRelalgOps=goUp(op, relalgBaseRef, layerInfo)
        const relatedSubOpOpss=goUp(op, subOpBaseRef, layerInfo)
        const relatedImpOps=goUp(op, impBaseRef, layerInfo)
        setSelectedRelAlgOps(relatedRelalgOps)
        setSelectedImperativeOps(relatedImpOps)
        setSelectedSubOpOps(relatedSubOpOpss)
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
            const op=instr.loc
            handleLLVMOpSelection(op)

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
                            {hasPlan&&<Tab eventKey="queryPlan" title="Query-Plan">

                            </Tab>}
                            {hasSubOpPlan&&<Tab eventKey="subopPlan" title="SubOp-Visualization">
                            </Tab>}
                            {hasPerf&&<Tab eventKey="perf" title="Perf">
                            </Tab>}
                        </Tabs>
                        <div style={{
                            visibility: activeLeftTab === "queryPlan" ? "visible" : "hidden",
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
                            visibility: activeLeftTab === "subopPlan" ? "visible" : "hidden",
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
                        {hasLayers && <div><Tabs activeKey={activeRightTab} onSelect={handleRightTabSelect}>
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
                                visibility: activeRightTab === "mlir_relalg" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={relalgMLIRData} selectedOps={selectedRelAlgOps} onOpClick={(d)=>handleRelAlgOpSelection(d.id)}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_subop" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={subopMLIRData} selectedOps={selectedSubOpOps} onOpClick={(d)=>handleSubOpSelection(d.id)}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_imperative" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={imperativeMLIRData} selectedOps={selectedImperativeOps} onOpClick={(d)=>{}}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "mlir_llvm" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>

                                <MLIRViewer height={2 * (window.innerHeight - 90) / 3}
                                            width={(window.innerWidth - 100) / 2}
                                            layer={llvmMLIRData} selectedOps={selectedLLVMOps} onOpClick={(d)=>handleLLVMOpSelection(d.id)}
                                            perfInfo={data.perf.generated}></MLIRViewer>
                            </div>
                            <div style={{
                                visibility: activeRightTab === "asm" ? "visible" : "hidden",
                                position: 'absolute'
                            }}>
                                {hasPerf && <PerfAsmViewer height={2 * (window.innerHeight - 90) / 3}
                                                           width={(window.innerWidth - 100) / 2}
                                                           data={data.perf.generated}
                                                           onInstrClick={handleInstrClick} selectedLLVMOps={selectedLLVMOps}></PerfAsmViewer>}
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
