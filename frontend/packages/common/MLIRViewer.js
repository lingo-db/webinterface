import {useEffect, useRef} from "react";

const Render = ({data, selectionState, onOpClick}) => {
    if (Array.isArray(data)) {
        return (<div>
            {data.map((child) => {
                return (<Render data={child} selectionState={selectionState} onOpClick={onOpClick}></Render>)
            })

            }
        </div>)
    } else if (data.type === "raw") {
        return renderRaw({data, selectionState, onOpClick})
    } else if (data.type === "op") {
        return renderOp({data, selectionState, onOpClick})
    } else if (data.type === "block") {
        return renderBlock({data, selectionState, onOpClick})
    } else if (data.type === "resultGroup") {
        return renderResultGroup({data, selectionState, onOpClick})
    } else if (data.type === "valueUse") {
        return renderValueUse({data, selectionState, onOpClick})
    } else if (data.type === "blockArgDef") {
        return renderBlockArgDef({data, selectionState, onOpClick})
    } else if (data.type === "opName") {
        return renderOpName({data, selectionState, onOpClick})
    } else if (data.type === "attribute") {
        return renderAttribute({data, selectionState, onOpClick})
    }else if (data.type==="type"){
        return renderType({data, selectionState, onOpClick})
    }
}
const renderOpName = ({data, selectionState, onOpClick}) => {
    return (
        <div style={{display: "inline", color: "gray"}}>
            {data.value}
        </div>)
}
const renderValueUse = ({data, selectionState, onOpClick}) => {
    return (<div style={{display: "inline", color: "blue"}}>
        {data.value}
    </div>)
}
const renderRaw = ({data, selectionState, onOpClick}) => {
    return (<div style={{display: "inline"}}>
        {data.value}
    </div>)
}
const renderResultGroup = ({data, selectionState, onOpClick}) => {
    return (<div style={{display: "inline", color: "blue"}}>
        {data.value}
    </div>)
}
const renderBlockArgDef = ({data, selectionState, onOpClick}) => {
    return (<div style={{display: "inline", color: "blue"}}>
        {data.value}
    </div>)
}
const renderOp = ({data, selectionState, onOpClick}) => {
    return (<div id={data.id} onClick={(e) => {
        e.stopPropagation();
        onOpClick(data)
    }} style={{backgroundColor: selectionState(data)}}>
        {data.children.map((child, index) => {
            return (<Render data={child} selectionState={selectionState} onOpClick={onOpClick}></Render>)
        })}
    </div>)

}
const renderAttribute = ({data, selectionState, onOpClick}) => {
    return (
        <div style={{display: "inline", color: "orange"}}>
            {data.value}
        </div>)
}
const renderType = ({data, selectionState, onOpClick}) => {
    return (
        <div style={{display: "inline", color: "green"}}>
            {data.value}
        </div>)

}

const renderBlock = ({data, selectionState, onOpClick}) => {
    let children=data.children
    if (data.eCB){
        children=children.slice(1,-1)
    }else{
        children=children.slice(1)
    }
    return (<div style={{display: "inline"}}>
        {data.sCB?"{":<Render data={data.children[0]} selectionState={selectionState} onOpClick={onOpClick}/>}
        <div style={{paddingLeft: "10px"}}>
            {children.map((child, index) => {
                return (<Render data={child} selectionState={selectionState} onOpClick={onOpClick}></Render>)
            })}
        </div>
        {data.eCB?"}":""}
    </div>)
}


export const MLIRViewer = ({layer, selectedOps, width, height}) => {
    const scrollableDivRef = useRef(null);
    const getBackground = (data) => {
        if (data.type === "op" && selectedOps.includes(data.id)) {
            return "yellow"
        }
        return "white"
    }
    useEffect(() => {
        if (selectedOps.length > 0 && scrollableDivRef) {
            let currentElement=document.getElementById(selectedOps[0])
            currentElement.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }, [selectedOps]);
    return (<div ref={scrollableDivRef} style={{maxWidth: width, maxHeight: height, overflow: "auto"}}>
        <Render data={layer.parsed} selectionState={getBackground} onOpClick={()=>{}}/>
    </div>)
}