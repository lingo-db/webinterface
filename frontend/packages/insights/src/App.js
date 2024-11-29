import './App.css';
import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Container, Form, Navbar, Row} from 'react-bootstrap';
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer";
import {TraceViewer} from "@lingodb/common/TraceViewer";
import {analyzeLayers, getBaseReference, goUp} from "@lingodb/common/MLIRLayerAnalysis";

const App = () => {
    const [data, setData] = useState(null);
    const [mlirData, setMlirData] = useState(null);
    const [hasTrace, setHasTrace] = useState(false);
    const [hasPlan, setHasPlan] = useState(false);
    const [hasLayers, setHasLayers] = useState(false);
    const [layerInfo, setLayerInfo] = useState(undefined)
    const [selectedOps, setSelectedOps] = useState([]);
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
            setMlirData(null)
            setHasTrace(false)
            setHasPlan(false)
            setHasLayers(false)
        } else {
            if(data.fileType==="traceOnly"){
                setHasTrace(true)
                setHasPlan(false)
                setHasLayers(false)
            }else if (data.fileType==="insights"){
                setHasTrace(true)
                setHasPlan(true)
                setHasLayers(true)
            }
            if (data.fileType==="insights") {
                const relalgModule = data.layers[data.layers.findIndex((layer) => layer.passInfo.argument === "relalg-introduce-tmp") + 1]
                setMlirData(relalgModule)
                console.log(relalgModule)
                let newLayerInfo=analyzeLayers(data.layers)
                setLayerInfo(newLayerInfo)
                const newRelAlgBaseRef = getBaseReference(relalgModule.passInfo.file)
                setRelalgBaseRef(newRelAlgBaseRef)
            }
        }
    }, [data])

    const handleTraceSelect = (trace) => {
        if (trace.category === "Execution" && trace.name === "Step" && hasLayers) {
            console.log(trace.extra.location)
            setSelectedOps(goUp(trace.extra.location,relalgBaseRef, layerInfo))
        }
    }

    const handleUnloadData = () => {
        setData(null);
        setSelectedOps([])
        setMlirData(null)
        setLayerInfo(null)
        setRelalgBaseRef(null)
        setHasTrace(false)
        setHasPlan(false)
        setHasLayers(false)

    };



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
                    <Col className="p-3" style={{height: (window.innerHeight - 80) / 3, backgroundColor: '#f8f9fa'}}>
                        {hasTrace && <TraceViewer height={(window.innerHeight - 80) / 3} width={window.innerWidth - 20}
                                                  traceData={data.trace} onSelect={handleTraceSelect}></TraceViewer>}
                    </Col>
                </Row>
                <Row>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                        {hasPlan &&
                            <RelationalPlanViewer height={2 * (window.innerHeight - 90) / 3} width={(window.innerWidth - 100) / 2}
                                                  input={data.plan} onOperatorSelect={(id) => setSelectedOps([id])} selectedOps={selectedOps}></RelationalPlanViewer>}
                    </Col>
                    <Col className="p-3" style={{backgroundColor: '#f8f9fa'}}>
                        {hasLayers &&
                            <MLIRViewer height={2 * (window.innerHeight - 90) / 3} width={(window.innerWidth - 100) / 2}
                                        layer={mlirData} selectedOps={selectedOps}></MLIRViewer>}
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
export default App;
