import './App.css';
import React, {useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Container, Form, Modal, Navbar, Row} from 'react-bootstrap';
import {TraceOnlyView} from "./TraceOnlyView";
import {ProfilingView} from "./ProfilingView";
import {DebuggingView} from "./DebuggingView";

const version = "0.0.3";
const App = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const handleDemoFile = async (file) => {
        try {
            const response = await fetch(`/files/${file}.json`);
            if (!response.ok) {
                setError("Failed to load JSON");
            }
            const jsonData = await response.json();
            setData(jsonData);
        } catch (error) {
            setError("Error loading JSON");
        }
    };
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (!json.version) {
                    setError("File does not contain version information.");
                } else if (json.version === version) {
                    setData(json);
                } else {
                    setError(`Unsupported file version. Supported version is ${version}`);
                }

            } catch (error) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    };


    //return <TraceViewer></TraceViewer>
    return (
        <div>
            {!data &&
                <div>
                    <Navbar bg="dark" variant="dark" fixed="top">
                        <Navbar.Brand href="#">LingoDB-CT</Navbar.Brand>
                    </Navbar>
                    <Container fluid className="vh-100 d-flex flex-column">
                        <Row className="flex-grow-1">
                            <Col
                                className="d-flex justify-content-center align-items-center bg-light"
                            >

                                <Form className="ml-auto">
                                    <Form.Label style={{fontSize: "3rem"}}>Upload ct.json</Form.Label>
                                    <Form.Control
                                        type="file"
                                        id="custom-file"
                                        label="Upload JSON"
                                        custom
                                        onChange={handleFileUpload}
                                    />

                                </Form>
                            </Col>
                        </Row>
                        <Row className="flex-grow-1">
                            <Col
                                className="d-flex flex-column justify-content-center align-items-center bg-dark text-white">
                                <h2>Demo Files</h2>
                                <p style={{marginTop:"40px"}}>

                                <Button variant="outline-light" onClick={()=>handleDemoFile("tpch-22-sf10")}> TPC-H Q22, SF=10</Button>
                                </p>
                            </Col>
                        </Row>
                    </Container>
                </div>
            }
            <Modal
                size="sm"
                show={!!error}
                onHide={() => setError(null)}
                aria-labelledby="error-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title id="error-modal">
                        Error while processing file
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>{error}</Modal.Body>
            </Modal>
            {data && data.fileType === "debugging" && <DebuggingView data={data} onClose={() => setData(null)}/>}
            {data && data.fileType === "traceOnly" && <TraceOnlyView data={data} onClose={() => setData(null)}/>}
            {data && data.fileType === "profiling" && <ProfilingView data={data} onClose={() => setData(null)}/>}

        </div>
    );
}
export default App;
