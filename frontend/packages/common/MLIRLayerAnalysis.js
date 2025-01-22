const enumEdges = (data, edgesDown, edgesUp) => {
    if (Array.isArray(data)) {
        data.forEach((child) => {
            enumEdges(child, edgesDown, edgesUp)
        })
    } else if (data.type === "op") {
        if (data.mappedId) {
            edgesUp[data.id] = data.mappedId
            if (!edgesDown[data.mappedId]){
                edgesDown[data.mappedId] = []
            }
            edgesDown[data.mappedId].push(data.id)
        }
        data.children.forEach((child) => {
            enumEdges(child, edgesDown, edgesUp)
        })
    } else if (data.type === "block") {
        data.children.forEach((child) => {
            enumEdges(child, edgesDown, edgesUp)
        })
    }
}

const indexOps = (data, indexed) => {
    if (Array.isArray(data)) {
        data.forEach((child) => {
            indexOps(child, indexed)
        })
    } else if (data.type === "op") {
        indexed[data.id] = data
        data.children.forEach((child) => {
            indexOps(child, indexed)
        })
    } else if (data.type === "block") {
        data.children.forEach((child) => {
            indexOps(child, indexed)
        })
    }
}
export const collectChildren = (data, res) => {
    if (Array.isArray(data)) {
        data.forEach((child) => {
            res.push(child.id)
            collectChildren(child, res)
        })
    } else if (data.type === "op") {
        res.push(data.id)
        data.children.forEach((child) => {
            collectChildren(child, res)
        });
    } else if (data.type === "block") {
        data.children.forEach((child) => {
            collectChildren(child, res)
        });
    }
}
export const collectChildrenWithData = (data, res) => {
    if (Array.isArray(data)) {
        data.forEach((child) => {
            res.push(child)
            collectChildrenWithData(child, res)
        })
    } else if (data.type === "op") {
        res.push(data)
        data.children.forEach((child) => {
            collectChildrenWithData(child, res)
        });
    } else if (data.type === "block") {
        data.children.forEach((child) => {
            collectChildrenWithData(child, res)
        });
    }
}

export const opSameExceptLocAndChildren = (leftData, rightData,valueMapping, first=false) => {
    if(leftData.type==="op" && rightData.type==="op"){
        if(!first){
            return true
        }
        if(leftData.children.length!==rightData.children.length){
            console.log("children length not equal")
            return false
        }
        for(let i=0;i<leftData.children.length;i++){
            if(!opSameExceptLocAndChildren(leftData.children[i],rightData.children[i],valueMapping)){
                return false
            }
        }
        return true
    }else if(leftData.type==="block" && rightData.type==="block") {
        if(!first){
            return true
        }
        if (leftData.children.length !== rightData.children.length) {
            console.log("block children length not equal")
            return false
        }
        for (let i = 0; i < leftData.children.length; i++) {
            if (!opSameExceptLocAndChildren(leftData.children[i], rightData.children[i],valueMapping)) {
                return false
            }
        }
        return true
    }else if(leftData.type==="raw" && rightData.type==="raw") {
        if(leftData.value!==rightData.value){
            console.log("raw value not equal")
        }
        return leftData.value === rightData.value
    }else if(leftData.type==="attribute" && rightData.type==="attribute") {
        if(leftData.value!==rightData.value){
            console.log("attribute value not equal")
        }
        return leftData.value === rightData.value
    }else if(leftData.type==="type" && rightData.type==="type") {
        if(leftData.value!==rightData.value){
            console.log("type value not equal")
        }
        return leftData.value === rightData.value
    }else if(leftData.type==="resultGroup" && rightData.type==="resultGroup") {
        return true
    }else if(leftData.type==="blockArgDef" && rightData.type==="blockArgDef") {
        if (leftData.value!==rightData.value) {
            console.log("blockArgDef children length not equal")
            return false
        }
        return leftData.value === rightData.value
    }else if(leftData.type==="valueUse" && rightData.type==="valueUse") {
        if (leftData.value===rightData.value) {
            return true
        }
        if(valueMapping[leftData.value] && valueMapping[leftData.value]===rightData.value){
            return true
        }
        return false
    }else if(leftData.type==="opName" && rightData.type==="opName") {
        if (leftData.value!==rightData.value) {
            console.log("opName children length not equal")
            return false
        }
        return leftData.value === rightData.value
    }else if(leftData.type==="loc" && rightData.type==="loc") {
        return true
    }else{
        console.log("do not match", leftData, rightData)
        return false
    }
}


export const goUp = (opId, relalgBaseRef, info) => {
    let collectedChildren = []
    if (!info.indexedOps[opId]) {
        console.log("could not find op", opId)
        return []
    }
    collectChildren(info.indexedOps[opId], collectedChildren)
    let res = []
    collectedChildren.forEach((childId) => {

        let curr = childId
        while (curr) {
            let op = info.indexedOps[curr]
            if (op.id.startsWith(relalgBaseRef + ":")) {
                res.push(op.id)
                break
            }
            curr = info.edgesUp[curr]
        }
    })
    return res;

}
export const goUpDirect = (opId, relalgBaseRef, info) => {
    let res = []
    if (!info.indexedOps[opId]) {
        console.log("could not find op", opId)
        return []
    }
    let curr = opId
    while (curr) {
        let op = info.indexedOps[curr]
        if (op.id.startsWith(relalgBaseRef + ":")) {
            res.push(op.id)
            break
        }
        curr = info.edgesUp[curr]
    }
    return res;
}

export const goDown = (opId, subOpBaseRef, info) => {
    let collectedChildren = []
    if (!info.indexedOps[opId]) {
        console.log("could not find op", opId)
        return []
    }
    collectChildren(info.indexedOps[opId], collectedChildren)
    let res = []
    const descend = (curr)=>{
        let op = info.indexedOps[curr]
        if (op.id.startsWith(subOpBaseRef + ":")) {
            res.push(op.id)
            return
        }
        const next=info.edgesDown[curr]
        if(next){
            next.forEach(n=>{
                descend(n)
            })
        }

    }
    collectedChildren.forEach((childId) => descend(childId))
    return res;
}
export const goDownDirect = (opId, subOpBaseRef, info) => {
    let res = []
    if (!info.indexedOps[opId]) {
        console.log("could not find op", opId)
        return []
    }
    const descend = (curr)=>{
        let op = info.indexedOps[curr]
        if (op.id.startsWith(subOpBaseRef + ":")) {
            res.push(op.id)
            return
        }
        const next=info.edgesDown[curr]
        if(next){
            next.forEach(n=>{
                descend(n)
            })
        }

    }
    descend(opId)
    return res;
}

export const analyzeLayers = (layers) => {

    let tmpEdgesDown = new Map
    let tmpEdgesUp = new Map
    const newIndexOps = {}
    layers.forEach((pass) => {
        enumEdges(pass.parsed, tmpEdgesDown, tmpEdgesUp)
        indexOps(pass.parsed, newIndexOps)
    })

    return {edgesUp: tmpEdgesUp, edgesDown: tmpEdgesDown, indexedOps: newIndexOps};

}

export const getBaseReference = (file) => {
    return file.split("/").pop().split(".")[0]
}