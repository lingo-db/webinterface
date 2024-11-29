const enumEdges = (data, edgesDown, edgesUp) => {
    console.log("enumEdges",data)
    if (Array.isArray(data)) {
        data.forEach((child) => {
            enumEdges(child, edgesDown, edgesUp)
        })
    } else if (data.type === "op") {
        if (data.mappedId) {
            console.log("setting", data.id, data.mappedId)
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
const collectChildren = (data, res) => {
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


export const goUp = (opId, relalgBaseRef, info) => {
    let collectedChildren = []
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

export const goDown = (opId, subOpBaseRef, info) => {
    let collectedChildren = []
    collectChildren(info.indexedOps[opId], collectedChildren)
    console.log(collectedChildren)
    console.log(info)
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

export const analyzeLayers = (layers) => {

    let tmpEdgesDown = new Map
    let tmpEdgesUp = new Map
    const newIndexOps = {}
    layers.forEach((pass) => {
        console.log(pass.parsed)
        enumEdges(pass.parsed, tmpEdgesDown, tmpEdgesUp)
        indexOps(pass.parsed, newIndexOps)
    })

    console.log(tmpEdgesUp)
    return {edgesUp: tmpEdgesUp, edgesDown: tmpEdgesDown, indexedOps: newIndexOps};

}

export const getBaseReference = (file) => {
    return file.split("/").pop().split(".")[0]
}