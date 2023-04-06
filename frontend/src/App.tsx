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

interface QueryResult {
    timing: {
        'QOpt': number
        'lowerRelAlg': number,
        'lowerSubOp': number,
        'lowerDB': number,
        'lowerDSA': number,
        'lowerToLLVM': number,
        'toLLVMIR': number,
        'llvmOptimize': number,
        'llvmCodeGen': number,
        'executionTime': number,
        'total': number
    }
    result: {
        columns: string[];
        rows: string[][];
    }
}

const ResultTable = ({timing,result}: QueryResult) => {
    return (
        <div style={{height: '50vh', overflow: 'auto'}}>
            <p>Execution: {(timing.executionTime).toFixed(1)} ms</p>
            <p>Optimization: {(timing.QOpt).toFixed(1)} ms</p>
            <p>Compilation: {(timing.lowerRelAlg+timing.lowerSubOp+timing.lowerDB+timing.lowerDSA+timing.lowerToLLVM+timing.toLLVMIR+timing.llvmOptimize+timing.llvmCodeGen).toFixed(1)} ms</p>

            <Table striped bordered style={{tableLayout: 'fixed'}}>
                <thead>
                <tr>
                    {result.columns.map((column: string, index: number) => (
                        <th key={index}>{column}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {result.rows.map((row: string[], index: number) => (
                    <tr key={index}>
                        {row.map((cell, index) => (
                            <td key={index}>{cell}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </Table>
        </div>
    );
};

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

    const [queryPlan, setQueryPlan] = useState<PlanGraphElement | undefined>(undefined)
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
        const response = await fetch(`http://localhost:8000/query_plan?database=${selectedDB.value}&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        console.log(data.name)
        setQueryPlan((new NormalizePlan(data)).getGraph());
    }
    const fetchQueryResult = async () => {
        console.log(query)
        const response = await fetch(`http://localhost:8000/execute?database=${selectedDB.value}&query=${encodeURIComponent(query)}`);
        setQueryResult(await response.json());
    }
    const handleExecute = () => {
        fetchQueryResult()
        setActiveTab('result')
        setQueryPlan(undefined)
    };
    const [activeTab, setActiveTab] = useState<string>('result');

    const handleTabSelect = (eventKey: string | null) => {
        if (eventKey) {
            setActiveTab(eventKey);
            console.log(`Selected tab: ${eventKey}`);
            if (eventKey === "queryPlan" && !queryPlan) {
                fetchQueryPlan()
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

            {queryResult &&
                <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
                    <Tab eventKey="result" title="Result">
                        {queryResult &&
                            <ResultTable result={queryResult.result} timing={queryResult.timing}></ResultTable>
                        }
                    </Tab>
                    <Tab eventKey="queryPlan" title="QueryPlan">
                        <div style={{height: '50vh', backgroundColor: "gray"}}>
                            {queryPlan &&

                                <GraphComponent
                                    rootElement={queryPlan}
                                />
                            }
                        </div>
                    </Tab>
                    <Tab eventKey="mlir" title="MLIR">
                        <h1>MLIR Tab</h1>
                        <p>This is the content of the MLIR tab.</p>
                    </Tab>
                </Tabs>
            }

        </div>
    );
}

export default App;
