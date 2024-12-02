import {useEffect, useRef} from "react";



const Instruction = ({data, selectionState, onInstrClick}) => {
    return (<div id={data.id} onClick={(e) => {
        e.stopPropagation();
        onInstrClick(data)
    }} style={{backgroundColor: selectionState(data)}}>
        <div style={{minWidth:50, display:"inline-block"}}>{data.samples}</div><div style={{display:"inline", fontFamily:"monospace", textDecoration: data.loc?"underline":"default"}}>{data.asm}</div>
    </div>)

}

const Func = ({data, selectionState, onInstrClick}) => {
    return (<div style={{display: "inline"}}>
        {data.func}
        <div style={{paddingLeft: "10px"}}>
            {data.assembly.map((child, index) => {
                return (<Instruction data={child} selectionState={selectionState} onInstrClick={onInstrClick}></Instruction>)
            })}
        </div>
    </div>)
}


export const PerfAsmViewer = ({data, selectedOps, width, height, onInstrClick}) => {
    const scrollableDivRef = useRef(null);
    const getBackground = (data) => {
        /*if (data.type === "op" && selectedOps.includes(data.id)) {
            return "yellow"
        }*/
        return "white"
    }
    /*useEffect(() => {
        if (selectedOps.length > 0 && scrollableDivRef) {
            let currentElement=document.getElementById(selectedOps[0])
            currentElement.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }, [selectedOps]);*/
    return (<div ref={scrollableDivRef} style={{maxWidth: width, maxHeight: height, overflow: "auto"}}>
        {
            data.map((f)=><Func data={f} selectionState={getBackground} onInstrClick={onInstrClick}/> )
        }
    </div>)
}