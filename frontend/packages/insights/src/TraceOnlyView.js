import React, {useEffect, useState} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, CloseButton, Col, Container, Form, Nav, Navbar, Row, Tab, Tabs} from 'react-bootstrap';
import {MLIRViewer} from "@lingodb/common/MLIRViewer";
import {RelationalPlanViewer} from "@lingodb/common/RelationalPlanViewer";
import {TraceViewer} from "@lingodb/common/TraceViewer";
import {
    analyzeLayers,
    collectChildren, collectChildrenWithData,
    getBaseReference,
    goDown,
    goDownDirect,
    goUp, goUpDirect, opSameExceptLoc, opSameExceptLocAndChildren
} from "@lingodb/common/MLIRLayerAnalysis";
import {SubOpPlanViewer} from "@lingodb/common/SubOpPlanViewer";
import {PerfSymbolTable} from "./PerfSymbolTable";
import {PerfAsmViewer} from "./PerfAsmViewer";

export const TraceOnlyView = ({data, onClose}) => {


    //return <TraceViewer></TraceViewer>
    return (
        <div>

            <Navbar bg="light"  fixed="top">
                <Nav className="ml-auto" style={{paddingLeft:10}}>
                <Navbar.Brand href="#">TraceViewer</Navbar.Brand>
                </Nav>
                <Nav className="ms-auto" style={{paddingRight:10}}>
                    <Form >
                        <CloseButton onClick={onClose}/>
                    </Form>
                </Nav>


            </Navbar>
                <Container fluid className="pt-5 mt-3">
                    <Row>
                        <Col className="p-3"
                             style={{height: (window.innerHeight - 80), backgroundColor: '#f8f9fa'}}>
                            {data &&
                                <TraceViewer height={(window.innerHeight - 80) } width={window.innerWidth - 20}
                                             traceData={data.trace} onSelect={()=>{}}></TraceViewer>}
                        </Col>
                    </Row>
                </Container>
        </div>
    );
}
