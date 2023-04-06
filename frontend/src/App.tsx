import React, {useRef, useState} from 'react';
import logo from './logo.svg';

import './App.css';
import GraphComponent from "./queryplan-viewer/GraphComponent";
import {NormalizePlan, PlanGraphElement} from "./queryplan-viewer/NormalizePlan";
import {OptimizerStep} from "./queryplan-viewer/models/Plan";
import Editor from "@monaco-editor/react";

import {Button, Table, Tabs, Tab, ButtonGroup, DropdownButton, Dropdown} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay} from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import {queries, QueryList, Query} from "./query_data";
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import CodeBlock from "./CodeBlock";
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
            console.log(eventKey)
            console.log(f)
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


function App() {
    const editorRef = useRef(null);
    const [query, setQuery] = useState(queries["tpch-1"][0].content)
    const [queryResult, setQueryResult] = useState<QueryResult | undefined>(undefined)
    const [queryResultLoading , setQueryResultLoading] =useState<boolean>(false);
    const [queryPlan, setQueryPlan] = useState<PlanGraphElement | undefined>(undefined)
    const [queryPlanLoading , setQueryPlanLoading] =useState<boolean>(false);
    const [mlirSteps, setMlirSteps] = useState<MLIRSteps | undefined>(undefined)
    const [mlirStepsLoading, setMlirStepsLoading] = useState<boolean>(false)
    const [showResults, setShowResults] = useState<boolean>(false)

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
    const fetchQueryPlan = async () => {
        setQueryPlanLoading(true)
        const response = await fetch(`http://localhost:8000/query_plan?database=${selectedDB.value}&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        setQueryPlan((new NormalizePlan(data)).getGraph());
        setQueryPlanLoading(false)
    }
    const fetchQueryResult = async () => {
        setQueryResultLoading(true)
        const response = await fetch(`http://localhost:8000/execute?database=${selectedDB.value}&query=${encodeURIComponent(query)}`);
        setQueryResult(await response.json());
        setQueryResultLoading(false)
    }
    const fetchMLIRSteps = async () => {
        setMlirStepsLoading(true)
        const response = await fetch(`http://localhost:8000/mlir_steps?database=${selectedDB.value}&query=${encodeURIComponent(query)}`);
        setMlirSteps(await response.json());
        setMlirStepsLoading(false)
    }
    const handleExecute = () => {
        setShowResults(true)
        setActiveTab('result')
        setQueryPlan(undefined)
        setMlirSteps(undefined)
        fetchQueryResult()
    };

    const [activeTab, setActiveTab] = useState<string>('result');

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
        const option = eventKey ? {label: eventKey, value: eventKey} : null;
        setSelectedDB(option ?? {label: 'TPC-H (SF1)', value: 'tpch-1'});
    };
    return (
        <div className="App">
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
                    <DropdownButton id="dropdown-basic-button" title={selectedDB.label} onSelect={handleSelectDB}>
                        <Dropdown.Item eventKey="tpch-1">TPC-H (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="tpcds-1">TPC-DS (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="job">JOB</Dropdown.Item>
                        <Dropdown.Item eventKey="uni">Uni</Dropdown.Item>
                    </DropdownButton>
                    <QuerySelection db={selectedDB.value} cb={(content) => setQuery(content)}></QuerySelection>
                </ButtonGroup>
            </div>
            {showResults &&
                <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
                    <Tab eventKey="result" title="Result">
                        <ResultViewer result={queryResult} loading={queryResultLoading}/>
                    </Tab>
                    <Tab eventKey="queryPlan" title="QueryPlan">
                        <div style={{height: '50vh', backgroundColor: "gray"}}>
                            <QueryPlanViewer plan={queryPlan} loading={queryPlanLoading}/>
                        </div>
                    </Tab>
                    <Tab eventKey="mlir" title="MLIR">
                        <MLIRViewer steps={mlirSteps} loading={mlirStepsLoading}/>
                    </Tab>
                </Tabs>
            }
        </div>
    );
}

export default App;
