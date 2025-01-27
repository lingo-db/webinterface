import './App.css';
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer"
import {useEffect, useRef, useState} from "react";
import {
    Button,
    Tabs,
    Tab,
    ButtonGroup,
    DropdownButton,
    Dropdown,
    Form,
    FormGroup,
    FormCheck, Spinner, Accordion
} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay} from '@fortawesome/free-solid-svg-icons';

import Editor from "@monaco-editor/react";
import 'bootstrap/dist/css/bootstrap.min.css';

import {queries} from "./queryData";
import {ResultTableViewer} from "./ResultTableViewer";
import {SubOpPlanViewer} from "@lingodb/common/SubOpPlanViewer";
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {
    analyzeLayers,
    getBaseReference,
    goUp,
    goDown
} from "@lingodb/common/MLIRLayerAnalysis";


export const RelationalPlanViewerWithLoading = ({input, loading, error, onOperatorSelect, selectedOps}) => {
    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if (error) {
        return (
            <div style={{height: '50vh', overflow: 'auto', maxWidth:"100vw"}}>
                An Error occurred:
                <pre >
                    {error}
                </pre>
            </div>
        )
    } else if (input) {
        return (<RelationalPlanViewer input={input} height={window.innerHeight * 0.5} width={window.innerWidth}
                                      selectedOps={selectedOps} onOperatorSelect={onOperatorSelect}/>)
    } else {
        return null
    }
}
export const SubOpPlanViewerWithLoading = ({input, loading, error, selectedOps, onOperatorSelect}) => {
    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if (error) {
        return (
            <div style={{height: '50vh', overflow: 'auto', maxWidth:"100vw"}}>
                An Error occurred:
                <pre>
                    {error}
                </pre>
            </div>
        )
    } else if (input) {
        return (
            <SubOpPlanViewer input={input} height={window.innerHeight * 0.5} width={window.innerWidth} selectedOps={selectedOps}
                             onOperatorSelect={onOperatorSelect}/>)
    } else {
        return null
    }
}
const QuerySelection = ({db, cb}) => {
    if (db in queries) {
        const availableQueries = queries[db]
        const handleSelect = (eventKey) => {
            const f = availableQueries.filter((q) => q.query === eventKey)
            cb(f[0].content)
        }
        return (<DropdownButton as={ButtonGroup} id="dropdown-basic-button" title="Select Query" onSelect={handleSelect}>
                {availableQueries.map(q => (
                    <Dropdown.Item eventKey={q.query}>{q.query}</Dropdown.Item>
                ))}
            </DropdownButton>
        )
    } else {
        return null
    }
}

const DropdownCheckbox = ({label, options, onChange}) => {
    const [selectedOptions, setSelectedOptions] = useState([]);

    const handleOptionChange = (value) => {
        let newSelected = []
        if (selectedOptions.includes(value)) {
            newSelected = selectedOptions.filter(option => option !== value)
        } else {
            newSelected = [...selectedOptions, value]
        }
        setSelectedOptions(newSelected);
        onChange(newSelected)
    };

    return (
        <DropdownButton as={ButtonGroup} title={label} variant="secondary">
            <Form>
                <FormGroup>
                    {options.map((option, index) => (
                        <FormCheck
                            key={index}
                            type="checkbox"
                            label={option.label}
                            checked={selectedOptions.includes(option.value)}
                            onChange={() => handleOptionChange(option.value)}
                        />
                    ))}
                </FormGroup>
            </Form>
        </DropdownButton>
    );
};

function App() {
    const editorRef = useRef(null);
    const [query, setQuery] = useState(queries["tpch-1"][0].content)
    const [queryResult, setQueryResult] = useState(undefined)
    const [queryResultLoading, setQueryResultLoading] = useState(false);
    const [queryResultError, setQueryResultError] = useState(undefined)

    const [queryPlan, setQueryPlan] = useState(undefined)
    const [subOpPlan, setSubOpPlan] = useState(undefined)
    const [queryPlanLoading, setQueryPlanLoading] = useState(false);
    const [queryPlanError, setQueryPlanError] = useState(undefined)

    const [layers, setLayers] = useState(undefined)
    const [layerInfo, setLayerInfo] = useState(undefined)
    const [showResults, setShowResults] = useState(false)
    const [realCardinalities, setRealCardinalities] = useState(false)


    const [selectedOp, setSelectedOp] = useState(null)
    const [selectedLayer, setSelectedLayer] = useState(null)

    const [selectedRelAlgOps, setSelectedRelAlgOps] = useState([])
    const [selectedSubOpOps, setSelectedSubOpOps] = useState([])
    const [selectedImpOps1, setSelectedImpOps1] = useState([])
    const [selectedImpOps2, setSelectedImpOps2] = useState([])

    const [selectedDB, setSelectedDB] = useState({
        label: 'TPC-H (SF1)',
        value: 'tpch-1',
    });

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
    }


    const handleQueryChange = (newQuery) => {
        if (editorRef.current) {
            // @ts-ignore
            setQuery(newQuery)
            console.log(query)
        }
    }
    const host = process.env.REACT_APP_API_URL
    const lingodb_commit=process.env.REACT_APP_LINGODB_COMMIT
    const fetchQueryPlan = async () => {
        try {
            setQueryPlanLoading(true)
            const response = await fetch(`${host}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    database: selectedDB.value,
                    query: query,
                    real_card: realCardinalities
                })
            });
            const json = await response.json()
            if (!response.ok) {
                throw new Error(json.detail);
            }
            setQueryPlan(json.plan);
            setSubOpPlan(json.subopplan)
            setLayers(json.mlir)
            const analyzed= analyzeLayers(json.mlir)
            setLayerInfo(analyzed)

        } catch (error) {
            console.log(error.message)
            setQueryPlanError(error.message)
        } finally {
            setQueryPlanLoading(false)

        }
    }
    const fetchQueryResult = async () => {
        setQueryResultLoading(true)
        try {
            const response = await fetch(`${host}/api/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    database: selectedDB.value,
                    query: query
                })
            });
            const json = await response.json()
            if (!response.ok) {
                throw new Error(json.detail);
            }
            setQueryResult(json);
        } catch (error) {
            console.log(error.message)
            setQueryResultError(error.message)
        } finally {
            setQueryResultLoading(false)
        }
    }

    const handleExecute = () => {
        setQueryPlanError(undefined)
        setQueryResultError(undefined)
        setShowResults(true)
        setActiveTab('result')
        setQueryPlan(undefined)
        setSubOpPlan(undefined)
        fetchQueryResult()
    };

    const [activeTab, setActiveTab] = useState('result');
    const handleOptionsChange = (selected) => {
        setRealCardinalities(!!selected.find(o => o === "real-cards"))
    }
    const handleTabSelect = (eventKey) => {
        if (eventKey) {
            setActiveTab(eventKey);
            console.log(`Selected tab: ${eventKey}`);
            if (eventKey !== "result" && !queryPlan) {
                fetchQueryPlan()
            }

        }
    };
    const handleSelectDB = (eventKey, event) => {
        if (eventKey) {
            let label = "";
            if (eventKey === "tpch-1") {
                label = "TPC-H (SF1)"
            } else if (eventKey === "tpcds-1") {
                label = "TPC-DS (SF1)"
            } else if (eventKey === "job") {
                label = "JOB"
            } else if (eventKey === "uni") {
                label = "Uni"
            }
            if (eventKey in queries) {
                setQuery(queries[eventKey][0].content)
            }
            setSelectedDB({label: label, value: eventKey})
        } else {
            setSelectedDB({label: 'TPC-H (SF1)', value: 'tpch-1'});
        }
    };


    useEffect(() => {
        if (selectedOp && selectedLayer) {
            const displayedLayers = [{idx: 1, fn: setSelectedRelAlgOps}, {
                idx: 3,
                fn: setSelectedSubOpOps
            }, {idx: 4, fn: setSelectedImpOps1}, {idx: 5, fn: setSelectedImpOps2}]
            displayedLayers.forEach((l) => {
                if (l.idx && selectedLayer !== l.idx) {
                    const baseRef = getBaseReference(layers[l.idx].passInfo.file)
                    const relatedOps = selectedLayer < l.idx ? goDown(selectedOp, baseRef, layerInfo) : goUp(selectedOp, baseRef, layerInfo)
                    l.fn(relatedOps)
                } else if (l.idx) {
                    l.fn([selectedOp])
                }
            })
        }
    }, [layers,layerInfo, selectedOp, selectedLayer])

    const handleSubOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(3)
    }
    const handleImp1Selection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(4)
    }
    const handleImp2Selection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(5)
    }
    const handleRelAlgOpSelection = (op) => {
        setSelectedOp(op)
        setSelectedLayer(1)
    }
    return (
        <div className="App">
            <Accordion>
                <Accordion.Item eventKey="0">
                    <Accordion.Header><b>This webinterface is for demo purposes only, and especially not suited for benchmarking.</b></Accordion.Header>
                    <Accordion.Body>
                        It runs with 4 threads on a small virtual machine (4 GiB RAM, 4 virtual cores), and LingoDB executes queries
                        with additional verifications. Furthermore, every request is processed by executing one of LingoDB's command line tools which first
                        loads the data set into memory, increasing the observable latency significantly.
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
            <Editor
                height={window.innerHeight*0.5-54-38-50}
                defaultLanguage="sql"
                value={query}
                onMount={handleEditorDidMount}
                onChange={handleQueryChange}
            />
            <div style={{textAlign: "center"}}>
                <ButtonGroup>
                        <Button variant="primary" onClick={handleExecute}>
                            <FontAwesomeIcon icon={faPlay}></FontAwesomeIcon> Execute Query
                        </Button>
                    <DropdownButton as={ButtonGroup} id="dropdown-basic-button" title={selectedDB.label} onSelect={handleSelectDB}>
                        <Dropdown.Item eventKey="tpch-1">TPC-H (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="tpcds-1">TPC-DS (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="job">JOB</Dropdown.Item>
                        <Dropdown.Item eventKey="uni">Uni</Dropdown.Item>
                    </DropdownButton>
                    <QuerySelection db={selectedDB.value} cb={(content) => setQuery(content)}></QuerySelection>
                    <DropdownCheckbox label="Options" options={[{label: 'Real Cardinalities', value: 'real-cards'}]}
                                      onChange={handleOptionsChange}/>
                    <a href={`https://github.com/lingo-db/lingo-db/commit/${lingodb_commit}`} rel="noreferrer" target="_blank" className="btn btn-outline-primary">
                        LingoDB@{lingodb_commit}
                    </a>
                </ButtonGroup>
            </div>
            {showResults &&
                <div>
                    <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
                        <Tab eventKey="result" title="Result">
                        </Tab>
                        <Tab eventKey="queryPlan" title="QueryPlan">

                        </Tab>
                        <Tab eventKey="subopPlan" title="SubOperators">
                        </Tab>
                        <Tab eventKey="mlir" title="MLIR (RelAlg)"/>
                        <Tab eventKey="mlir2" title="MLIR (SubOp)"/>
                        <Tab eventKey="mlir3" title="MLIR (HL. Imperative)"/>
                        <Tab eventKey="mlir4" title="MLIR (LL. Imperative)"/>
                    </Tabs>

                    <div eventKey="result" title="Result"
                         style={{visibility: activeTab === "result" ? "visible" : "hidden", position: 'absolute'}}>
                        <ResultTableViewer result={queryResult} loading={queryResultLoading} error={queryResultError}/>
                    </div>
                    <div eventKey="queryPlan" title="QueryPlan"
                         style={{visibility: activeTab === "queryPlan" ? "visible" : "hidden", position: 'absolute'}}>
                        <div style={{height: '50vh'}}>
                            <RelationalPlanViewerWithLoading input={queryPlan} loading={queryPlanLoading}
                                                             error={queryPlanError}
                                                             onOperatorSelect={handleRelAlgOpSelection}
                                                             selectedOps={selectedRelAlgOps}/>
                        </div>
                    </div>
                    <div eventKey="subopPlan" title="SubOperatorPlan"
                         style={{visibility: activeTab === "subopPlan" ? "visible" : "hidden", position: 'absolute'}}>
                        <div style={{height: '50vh', backgroundColor: "gray"}}>
                            <SubOpPlanViewerWithLoading input={subOpPlan} loading={queryPlanLoading}
                                                        error={queryPlanError} selectedOps={selectedSubOpOps}
                                                        onOperatorSelect={handleSubOpSelection}/>
                        </div>
                    </div>
                    <div eventKey="mlir" title="MLIR"
                         style={{
                             visibility: activeTab === "mlir" ? "visible" : "hidden",
                             position: 'absolute',
                             textAlign: "left"
                         }}>
                        <div style={{height: '50vh'}}>
                            {layers && <MLIRViewer height={window.innerHeight * 0.5} width={window.innerWidth}
                                                   selectedOps={selectedRelAlgOps} layer={layers[1]} onOpClick={(d)=>handleRelAlgOpSelection(d.id)}/>}
                        </div>
                    </div>
                    <div title="MLIR"
                         style={{
                             visibility: activeTab === "mlir2" ? "visible" : "hidden",
                             position: 'absolute',
                             textAlign: "left"
                         }}>
                        <div style={{height: '50vh'}}>
                            {layers && <MLIRViewer height={window.innerHeight * 0.5} width={window.innerWidth}
                                                   selectedOps={selectedSubOpOps} layer={layers[3]} onOpClick={(d)=>handleSubOpSelection(d.id)}/>}
                        </div>
                    </div>
                    <div title="MLIR"
                         style={{
                             visibility: activeTab === "mlir3" ? "visible" : "hidden",
                             position: 'absolute',
                             textAlign: "left"
                         }}>
                        <div style={{height: '50vh'}}>
                            {layers && <MLIRViewer height={window.innerHeight * 0.5} width={window.innerWidth}
                                                   selectedOps={selectedImpOps1} layer={layers[4]}  onOpClick={(d)=>{handleImp1Selection(d.id)}}/>}
                        </div>
                    </div>
                    <div title="MLIR"
                         style={{
                             visibility: activeTab === "mlir4" ? "visible" : "hidden",
                             position: 'absolute',
                             textAlign: "left"
                         }}>
                        <div style={{height: '50vh'}}>
                            {layers && <MLIRViewer height={window.innerHeight * 0.5} width={window.innerWidth}
                                                   selectedOps={selectedImpOps2} layer={layers[5]}  onOpClick={(d)=>{handleImp2Selection(d.id)}}/>}
                        </div>
                    </div>
                </div>
            }
        </div>)
}

export default App;
