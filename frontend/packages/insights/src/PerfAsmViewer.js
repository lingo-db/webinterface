import {useEffect, useRef, useState} from "react";


const Instruction = ({data, selectionState, onInstrClick}) => {
    const selBackgroundColor = data.loc&&selectionState.includes(data.loc) ? "yellow" : "transparent"
    return (<div id={data.id} onClick={(e) => {
        e.stopPropagation();
        onInstrClick(data)
    }} style={{backgroundColor: `rgba(255,0,0,${data.localPercentage / 100 * 10})`}}>
        <div style={{
            minWidth: 80,
            display: "inline-block"
        }}>{data.localPercentage > 0.05 ? `${data.localPercentage.toFixed(1)}%` : ""}</div>
        <div style={{
            backgroundColor: selBackgroundColor,
            display: "inline",
            fontFamily: "monospace",
            textDecoration: data.loc ? "underline" : "default",
        }}>{data.asm}</div>
    </div>)

}

const Func = ({data, selectionState, onInstrClick}) => {
    let totalFuncEvents = data.assembly.reduce((a, c) => a + c.samples, 0)

    return (<div style={{display: "inline"}}>
        {data.func}
        <div style={{paddingLeft: "10px"}}>
            {data.assembly.map((child, index) => {
                return (<Instruction data={{...child, localPercentage: child.samples / totalFuncEvents * 100}}
                                     selectionState={selectionState} onInstrClick={onInstrClick}></Instruction>)
            })}
        </div>
    </div>)
}


export const PerfAsmViewer = ({data, selectedOps, width, height, onInstrClick, selectedLLVMOps}) => {
    const scrollableDivRef = useRef(null);



    return (<div ref={scrollableDivRef} style={{maxWidth: width, maxHeight: height, overflow: "auto"}}>
        {
            data.map((f) => <Func data={f} selectionState={selectedLLVMOps} onInstrClick={onInstrClick}/>)
        }
    </div>)
}