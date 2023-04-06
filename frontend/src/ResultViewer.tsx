import {Table, Spinner} from "react-bootstrap";
import React from "react";

export interface QueryResult {
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

interface ResultViewerProps {
    result: QueryResult|undefined;
    loading: boolean;

}

export const ResultViewer = ({result, loading}: ResultViewerProps) => {

    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign:"center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if(result){
        const timing = result.timing

        return (
            <div style={{height: '50vh', overflow: 'auto'}}>
                <p>Execution: {(timing.executionTime).toFixed(1)} ms</p>
                <p>Optimization: {(timing.QOpt).toFixed(1)} ms</p>
                <p>Compilation: {(timing.lowerRelAlg + timing.lowerSubOp + timing.lowerDB + timing.lowerDSA + timing.lowerToLLVM + timing.toLLVMIR + timing.llvmOptimize + timing.llvmCodeGen).toFixed(1)} ms</p>

                <Table striped bordered style={{tableLayout: 'fixed'}}>
                    <thead>
                    <tr>
                        {result.result.columns.map((column: string, index: number) => (
                            <th key={index}>{column}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {result.result.rows.map((row: string[], index: number) => (
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
    }else{
        return null
    }
};