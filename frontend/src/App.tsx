import React, {useRef, useState} from 'react';

import './App.css';
import {NormalizePlan, PlanGraphElement} from "./queryplan-viewer/NormalizePlan";
import Editor from "@monaco-editor/react";
import {Button, Table, Tabs, Tab, ButtonGroup, DropdownButton, Dropdown, Form, FormGroup,FormCheck,Alert} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay} from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import {queries, QueryList, Query} from "./query_data";
import 'highlight.js/styles/atom-one-dark.css';
import {MLIRSteps, MLIRViewer} from "./MLIRViewer";
import {QueryResult, ResultViewer} from "./ResultViewer";
import {QueryPlanViewer} from "./QueryPlanViewer";


interface QuerySelectionProps {
    db: string
    cb: (arg0: string) => void
}

const QuerySelection = ({db, cb}: QuerySelectionProps) => {
    if (db in queries) {
        const availableQueries = queries[db as keyof QueryList]
        const handleSelect = (eventKey: string | null) => {
            const f = availableQueries.filter((q) => q.query === eventKey)
            cb(f[0].content)
        }
        return (<DropdownButton id="dropdown-basic-button" title="Select Query" onSelect={handleSelect}>
                {availableQueries.map(q => (
                    <Dropdown.Item eventKey={q.query}>{q.query}</Dropdown.Item>
                ))}
            </DropdownButton>
        )
    } else {
        return null
    }
}


interface SelectedDB {
    label: string;
    value: string;
}

interface Option {
    label: string;
    value: string;
}

interface DropdownCheckboxProps {
    label: string;
    options: Option[];
    onChange: (selected:string[])=>void;
}

const DropdownCheckbox: React.FC<DropdownCheckboxProps> = ({ label, options , onChange}) => {
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    const handleOptionChange = (value: string) => {
        let newSelected=[]
        if (selectedOptions.includes(value)) {
            newSelected=selectedOptions.filter(option => option !== value)
        } else {
            newSelected=[...selectedOptions, value]
        }
        setSelectedOptions(newSelected);
        onChange(newSelected)
    };

    return (
        <DropdownButton title={label} variant="secondary">
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
    const [queryResult, setQueryResult] = useState<QueryResult | undefined>(undefined)
    const [queryResultLoading, setQueryResultLoading] = useState<boolean>(false);
    const [queryResultError, setQueryResultError] = useState<string | undefined>(undefined)

    const [queryPlan, setQueryPlan] = useState<PlanGraphElement | undefined>(undefined)
    const [queryPlanLoading, setQueryPlanLoading] = useState<boolean>(false);
    const [queryPlanError, setQueryPlanError] = useState<string | undefined>(undefined)

    const [mlirSteps, setMlirSteps] = useState<MLIRSteps | undefined>(undefined)
    const [mlirStepsLoading, setMlirStepsLoading] = useState<boolean>(false)
    const [mlirStepsError, setMlirStepsError] = useState<string | undefined>(undefined)

    const [showResults, setShowResults] = useState<boolean>(false)
    const [realCardinalities, setRealCardinalities] = useState<boolean>(false)

    const [selectedDB, setSelectedDB] = useState<SelectedDB>({
        label: 'TPC-H (SF1)',
        value: 'tpch-1',
    });

    function handleEditorDidMount(editor: any, monaco: any) {
        editorRef.current = editor;
    }


    const handleQueryChange = (newQuery: string | undefined) => {
        if (editorRef.current) {
            // @ts-ignore
            setQuery(newQuery)
            console.log(query)
        }
    }
    const host=""
    const fetchQueryPlan = async () => {
        try {
            setQueryPlanLoading(true)
            const response = await fetch(`${host}/api/${realCardinalities?'analyzed_query_plan':'query_plan'}`,{
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
            setQueryPlan((new NormalizePlan(json)).getGraph());
        } catch (error: any) {
            console.log(error.message)
            setQueryPlanError(error.message)
        } finally {
            setQueryPlanLoading(false)

        }
    }
    const fetchQueryResult = async () => {
        setQueryResultLoading(true)
        try {
            const response = await fetch(`${host}/api/execute`,{
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
        } catch (error: any) {
            console.log(error.message)
            setQueryResultError(error.message)
        } finally {
            setQueryResultLoading(false)
        }
    }
    const fetchMLIRSteps = async () => {
        setMlirStepsLoading(true)
        try {
            const response = await fetch(`${host}/api/mlir_steps`,{
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
            setMlirSteps(json);
        } catch (error: any) {
            console.log(error.message)
            setMlirStepsError(error.message)
        } finally {
            setMlirStepsLoading(false)
        }

    }
    const handleExecute = () => {
        setQueryPlanError(undefined)
        setQueryResultError(undefined)
        setMlirStepsError(undefined)
        setShowResults(true)
        setActiveTab('result')
        setQueryPlan(undefined)
        setMlirSteps(undefined)
        fetchQueryResult()
    };

    const [activeTab, setActiveTab] = useState<string>('result');
    const handleOptionsChange = (selected:string[])=>{
        setRealCardinalities(!!selected.find(o=>o==="real-cards"))
    }
    const handleTabSelect = (eventKey: string | null) => {
        if (eventKey) {
            setActiveTab(eventKey);
            console.log(`Selected tab: ${eventKey}`);
            if (eventKey === "queryPlan" && !queryPlan) {
                fetchQueryPlan()
            }
            if (eventKey === "mlir") {
                fetchMLIRSteps()
            }
        }
    };
    const handleSelectDB = (eventKey: string | null, event: React.SyntheticEvent<unknown>) => {
        if(eventKey){
            let label="";
            if(eventKey==="tpch-1"){
                label="TPC-H (SF1)"
            }else if(eventKey==="tpcds-1"){
                label="TPC-DS (SF1)"
            }else if(eventKey==="job"){
                label="JOB"
            }else if(eventKey==="uni"){
                label="Uni"
            }
            if(eventKey in queries){
                setQuery(queries[eventKey as keyof QueryList][0].content)
            }
            setSelectedDB({label: label, value: eventKey})
        }else{
            setSelectedDB( {label: 'TPC-H (SF1)', value: 'tpch-1'});
        }
    };
    return (
        <div className="App">
            <h2>SQL WebInterface</h2>
            <Alert variant="warning">
                <b>Note!</b> This webinterface is for demo purposes only, and especially not suited for benchmarking.
                It runs on a very old, low-end server (i7-3770 CPU, 32 GB), and LingoDB executes queries with additional verifications.
                Furthermore, every request is processed by executing one of LingoDB's command line tools which first loads the entire data set into memory, increasing the observable latency significantly.
            </Alert>
            <Editor
                height="40vh"
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
                    <DropdownButton id="dropdown-basic-button" title={selectedDB.label} onSelect={handleSelectDB} >
                        <Dropdown.Item eventKey="tpch-1">TPC-H (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="tpcds-1">TPC-DS (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="job">JOB</Dropdown.Item>
                        <Dropdown.Item eventKey="uni">Uni</Dropdown.Item>
                    </DropdownButton>
                    <QuerySelection db={selectedDB.value} cb={(content) => setQuery(content)}></QuerySelection>
                    <DropdownCheckbox label="Options" options={[{label:'Real Cardinalities',value:'real-cards'}]} onChange={handleOptionsChange}/>
                </ButtonGroup>
            </div>
            {showResults &&
                <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
                    <Tab eventKey="result" title="Result">
                        <ResultViewer result={queryResult} loading={queryResultLoading} error={queryResultError}/>
                    </Tab>
                    <Tab eventKey="queryPlan" title="QueryPlan">
                        <div style={{height: '50vh', backgroundColor: "gray"}}>
                            <QueryPlanViewer plan={queryPlan} loading={queryPlanLoading} error={queryPlanError}/>
                        </div>
                    </Tab>
                    <Tab eventKey="mlir" title="MLIR">
                        <MLIRViewer steps={mlirSteps} loading={mlirStepsLoading} error={mlirStepsError}/>
                    </Tab>
                </Tabs>
            }
        </div>
    );
}

export default App;
