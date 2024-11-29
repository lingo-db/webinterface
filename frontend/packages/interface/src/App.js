import logo from './logo.svg';
import './App.css';
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer"
import {useRef, useState} from "react";
import {
    Button,
    Table,
    Tabs,
    Tab,
    ButtonGroup,
    DropdownButton,
    Dropdown,
    Form,
    FormGroup,
    FormCheck,
    Alert, Spinner
} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay} from '@fortawesome/free-solid-svg-icons';

import Editor from "@monaco-editor/react";
import 'bootstrap/dist/css/bootstrap.min.css';

//import {queries} from "./queryData";
import {ResultTableViewer} from "./ResultTableViewer";
import {SubOpPlanViewer} from "@lingodb/common/SubOpPlanViewer";
import {MLIRViewer} from "@lingodb/common/MLIRViewer";


export const RelationalPlanViewerWithLoading = ({input, loading, error, onOperatorSelect, selectedOps}) => {
    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if (error) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                An Error occurred:
                <pre>
                    {error}
                </pre>
            </div>
        )
    } else if (input) {
        return (<RelationalPlanViewer input={input} height={window.innerHeight*0.5} width={window.innerWidth} selectedOps={selectedOps} onOperatorSelect={onOperatorSelect}/>)
    } else {
        return null
    }
}
export const SubOpPlanViewerWithLoading = ({input, loading, error}) => {
    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if (error) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                An Error occurred:
                <pre>
                    {error}
                </pre>
            </div>
        )
    } else if (input) {
        return (<SubOpPlanViewer input={input} height={window.innerHeight*0.5} width={window.innerWidth} selectedOps={[]} onOperatorSelect={()=>{}}/>)
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
const queries = {
    "tpch-1": [{
        "query": "1",
        "content": "-- TPC-H Query 1\n\nselect\n        l_returnflag,\n        l_linestatus,\n        sum(l_quantity) as sum_qty,\n        sum(l_extendedprice) as sum_base_price,\n        sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,\n        sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,\n        avg(l_quantity) as avg_qty,\n        avg(l_extendedprice) as avg_price,\n        avg(l_discount) as avg_disc,\n        count(*) as count_order\nfrom\n        lineitem\nwhere\n        l_shipdate <= date '1998-12-01' - interval '90' day\ngroup by\n        l_returnflag,\n        l_linestatus\norder by\n        l_returnflag,\n        l_linestatus\n"
    }, {
        "query": "2",
        "content": "-- TPC-H Query 2\n\nselect\n        s_acctbal,\n        s_name,\n        n_name,\n        p_partkey,\n        p_mfgr,\n        s_address,\n        s_phone,\n        s_comment\nfrom\n        part,\n        supplier,\n        partsupp,\n        nation,\n        region\nwhere\n        p_partkey = ps_partkey\n        and s_suppkey = ps_suppkey\n        and p_size = 15\n        and p_type like '%BRASS'\n        and s_nationkey = n_nationkey\n        and n_regionkey = r_regionkey\n        and r_name = 'EUROPE'\n        and ps_supplycost = (\n                select\n                        min(ps_supplycost)\n                from\n                        partsupp,\n                        supplier,\n                        nation,\n                        region\n                where\n                        p_partkey = ps_partkey\n                        and s_suppkey = ps_suppkey\n                        and s_nationkey = n_nationkey\n                        and n_regionkey = r_regionkey\n                        and r_name = 'EUROPE'\n        )\norder by\n        s_acctbal desc,\n        n_name,\n        s_name,\n        p_partkey\nlimit 100\n"
    }, {
        "query": "3",
        "content": "-- TPC-H Query 3\n\nselect\n        l_orderkey,\n        sum(l_extendedprice * (1 - l_discount)) as revenue,\n        o_orderdate,\n        o_shippriority\nfrom\n        customer,\n        orders,\n        lineitem\nwhere\n        c_mktsegment = 'BUILDING'\n        and c_custkey = o_custkey\n        and l_orderkey = o_orderkey\n        and o_orderdate < date '1995-03-15'\n        and l_shipdate > date '1995-03-15'\ngroup by\n        l_orderkey,\n        o_orderdate,\n        o_shippriority\norder by\n        revenue desc,\n        o_orderdate\nlimit 10\n"
    }]}
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
    function App()
{
    const editorRef = useRef(null);
    const [query, setQuery] = useState(queries["tpch-1"][0].content)
    const [queryResult, setQueryResult] = useState(undefined)
    const [queryResultLoading, setQueryResultLoading] = useState(false);
    const [queryResultError, setQueryResultError] = useState(undefined)

    const [queryPlan, setQueryPlan] = useState(undefined)
    const [subOpPlan, setSubOpPlan] = useState(undefined)
    const [queryPlanLoading, setQueryPlanLoading] = useState(false);
    const [queryPlanError, setQueryPlanError] = useState(undefined)

    const [mlirSteps, setMlirSteps] = useState(undefined)
    const [mlirStepsLoading, setMlirStepsLoading] = useState(false)
    const [mlirStepsError, setMlirStepsError] = useState(undefined)

    const [showResults, setShowResults] = useState(false)
    const [realCardinalities, setRealCardinalities] = useState(false)

    const [selectedOps, setSelectedOps] = useState([])

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
    const host = "http://127.0.0.1:8000"
    const fetchQueryPlan = async () => {
        try {
            setQueryPlanLoading(true)
            const response = await fetch(`${host}/api/${realCardinalities ? 'analyzed_query_plan' : 'query_plan'}`, {
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
            setQueryPlan(json.plan);
            console.log(json.subopplan)
            setSubOpPlan(json.subopplan)
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
    const fetchMLIRSteps = async () => {
        setMlirStepsLoading(true)
        try {
            const response = await fetch(`${host}/api/mlir_steps`, {
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
        } catch (error) {
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
        setSubOpPlan(undefined)
        setMlirSteps(undefined)
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
    return (
        <div className="App">
            <h2>SQL WebInterface</h2>
            <Alert variant="warning">
                <b>Note!</b> This webinterface is for demo purposes only, and especially not suited for benchmarking.
                It runs with 4 threads on a very old, low-end server (i7-3770 CPU, 32 GB), and LingoDB executes queries
                with additional verifications.
                Furthermore, every request is processed by executing one of LingoDB's command line tools which first
                loads the data set into memory, increasing the observable latency significantly.
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
                    <div id="rounded">
                        <Button variant="primary" onClick={handleExecute}>
                            <FontAwesomeIcon icon={faPlay}></FontAwesomeIcon> Execute Query
                        </Button>
                    </div>
                    <DropdownButton id="dropdown-basic-button" title={selectedDB.label} onSelect={handleSelectDB}>
                        <Dropdown.Item eventKey="tpch-1">TPC-H (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="tpcds-1">TPC-DS (SF1)</Dropdown.Item>
                        <Dropdown.Item eventKey="job">JOB</Dropdown.Item>
                        <Dropdown.Item eventKey="uni">Uni</Dropdown.Item>
                    </DropdownButton>
                    <QuerySelection db={selectedDB.value} cb={(content) => setQuery(content)}></QuerySelection>
                    <DropdownCheckbox label="Options" options={[{label: 'Real Cardinalities', value: 'real-cards'}]}
                                      onChange={handleOptionsChange}/>
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
                        <Tab eventKey="mlir" title="MLIR">
                        </Tab>
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
                                                             onOperatorSelect={(id) => setSelectedOps([id])}
                                                             selectedOps={selectedOps}/>
                        </div>
                    </div>
                    <div eventKey="subopPlan" title="SubOperatorPlan"
                         style={{visibility: activeTab === "subopPlan" ? "visible" : "hidden", position: 'absolute'}}>
                        <div style={{height: '50vh', backgroundColor: "gray"}}>
                            <SubOpPlanViewerWithLoading input={subOpPlan} loading={queryPlanLoading}
                                                        error={queryPlanError}/>
                        </div>
                    </div>
                    <div eventKey="mlir" title="MLIR"
                         style={{visibility: activeTab === "mlir" ? "visible" : "hidden", position: 'absolute'}}>
                        <div style={{height: '50vh'}}>
                            MLIR (todo)
                        </div>
                    </div>
                </div>
            }
        </div>)
}

export default App;
