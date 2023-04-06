import React, {useState} from "react";
import {Spinner, Tab, Tabs} from "react-bootstrap";
import CodeBlock from "./CodeBlock";

export interface MLIRSteps {
    canonical: string;
    qopt: string;
    subop: string;
    imperative: string;
    lowlevel: string;
}

export interface MLIRViewerProps {
    steps: MLIRSteps|undefined;
    loading:boolean
}

export const MLIRViewer = ({steps,loading}: MLIRViewerProps) => {
    const [activeTab, setActiveTab] = useState<string>('canonical');
    const handleTabSelect = (eventKey: string | null) => {
        if (eventKey) {
            setActiveTab(eventKey);
        }
    };
    if (loading) {
        console.log('loading')
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign:"center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if(steps){
        return (
            <div style={{height: '50vh', overflow: 'auto'}}>
                <Tabs activeKey={activeTab} unmountOnExit={true}
                      mountOnEnter={true}
                      transition={false} onSelect={handleTabSelect}>
                    <Tab eventKey="canonical" title="Canonical">
                        <CodeBlock language="mlir" code={steps.canonical}/>
                    </Tab>
                    <Tab eventKey="qopt" title="Optimized">
                        <CodeBlock language="mlir" code={steps.qopt}/>
                    </Tab>
                    <Tab eventKey="subop" title="Sub-Operators">
                        <CodeBlock language="mlir" code={steps.subop}/>
                    </Tab>
                    <Tab eventKey="imperative" title="Imperative">
                        <CodeBlock language="mlir" code={steps.imperative}/>
                    </Tab>
                    <Tab eventKey="lowlevel" title="Low-Level">
                        <CodeBlock language="mlir" code={steps.lowlevel}/>
                    </Tab>
                </Tabs>
            </div>
        );
    }else{
        return null
    }
}