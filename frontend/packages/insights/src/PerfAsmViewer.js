import {useRef} from "react";



const Instruction = ({data, selectionState, onInstrClick}) => {
    const selBackgroundColor=selectionState(data)
    return (<div id={data.id} onClick={(e) => {
        e.stopPropagation();
        onInstrClick(data)
    }} style={{backgroundColor: selBackgroundColor==="white"? `rgba(255,0,0,${data.localPercentage/100*10})`: selBackgroundColor}}>
        <div style={{minWidth:80, display:"inline-block"}}>{data.localPercentage>0.05?`${data.localPercentage.toFixed(1)}%`:""}</div><div style={{display:"inline", fontFamily:"monospace", textDecoration: data.loc?"underline":"default"}}>{data.asm}</div>
    </div>)

}

const Func = ({data, selectionState, onInstrClick}) => {
    let totalFuncEvents=data.assembly.reduce((a, c)=>a+c.samples,0)

    return (<div style={{display: "inline"}}>
        {data.func}
        <div style={{paddingLeft: "10px"}}>
            {data.assembly.map((child, index) => {
                return (<Instruction data={{...child,localPercentage:child.samples/totalFuncEvents*100}} selectionState={selectionState} onInstrClick={onInstrClick}></Instruction>)
            })}
        </div>
    </div>)
}


export const PerfAsmViewer = ({data, selectedOps, width, height, onInstrClick,selectedLLVMOps}) => {
    const scrollableDivRef = useRef(null);
    const getBackground = (data) => {
        console.log(selectedLLVMOps, data.loc)
        if (data.loc && selectedLLVMOps.includes(data.loc)) {
            return "yellow"
        }
        return "white"
    }

    return (<div ref={scrollableDivRef} style={{maxWidth: width, maxHeight: height, overflow: "auto"}}>
        {
            data.map((f)=><Func data={f} selectionState={getBackground} onInstrClick={onInstrClick}/> )
        }
    </div>)
}