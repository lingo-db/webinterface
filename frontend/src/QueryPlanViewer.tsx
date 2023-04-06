import {PlanGraphElement} from "./queryplan-viewer/NormalizePlan";
import {Spinner} from "react-bootstrap";
import React from "react";
import GraphComponent from "./queryplan-viewer/GraphComponent";

interface QueryPlanViewerProps{
    plan: PlanGraphElement | undefined;
    loading: boolean
}
export const QueryPlanViewer= ({plan,loading}:QueryPlanViewerProps) =>{
    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign:"center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if(plan){
        return (<GraphComponent rootElement={plan}/>)
    }else{
        return null
    }
}