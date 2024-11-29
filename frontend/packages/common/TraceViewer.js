import {useEffect, useState} from "react";
import {Circle, Group, Layer, Line, Rect, Stage, Text} from "react-konva";








const baseColors = ['hsl(4, 72%, 63.8%)', 'hsl(340, 65.6%, 57.2%)', 'hsl(291, 51.2%, 46.2%)', 'hsl(262, 41.6%, 51.7%)', 'hsl(231, 38.4%, 52.8%)', 'hsl(207, 72%, 59.4%)', 'hsl(199, 78.4%, 52.8%)', 'hsl(187, 80%, 46.2%)', 'hsl(174, 80%, 31.9%)', 'hsl(122, 31.2%, 53.9%)', 'hsl(88, 40%, 58.3%)', 'hsl(66, 56%, 59.4%)', 'hsl(45, 80%, 56.1%)', 'hsl(36, 80%, 55%)', 'hsl(14, 80%, 62.7%)', 'hsl(16, 20%, 41.8%)', 'hsl(200, 14.4%, 50.6%)', 'hsl(54, 80%, 68.2%)']
const variantColors = ['hsl(4, 57.6%, 82.94%)', 'hsl(340, 52.48%, 74.36%)', 'hsl(291, 40.96%, 60.06%)', 'hsl(262, 33.28%, 67.21000000000001%)', 'hsl(231, 30.72%, 68.64%)', 'hsl(207, 57.6%, 77.22%)', 'hsl(199, 62.720000000000006%, 68.64%)', 'hsl(187, 64%, 60.06%)', 'hsl(174, 64%, 41.47%)', 'hsl(122, 24.96%, 70.07%)', 'hsl(88, 32%, 75.78999999999999%)', 'hsl(66, 44.8%, 77.22%)', 'hsl(45, 64%, 72.93%)', 'hsl(36, 64%, 71.5%)', 'hsl(14, 64%, 81.51%)', 'hsl(16, 16%, 54.339999999999996%)', 'hsl(200, 11.52%, 65.78%)', 'hsl(54, 64%, 88.66%)']

export const TraceViewer = ({traceData,width, height, onSelect}) => {
    const [showExecutionOnly, setShowExecutionOnly] = useState(true)
    const [data, setData] = useState([])
    let [scaleX, setScaleX] = useState(1);
    let [timeRange, setTimeRange] = useState([0, 1]);
    let [initialScaleX, setInitialScaleX] = useState(1)
    const [maxTime, setMaxTime] = useState(1)
    const [threads, setThreads] = useState([])
    const [categoryColors, setCategoryColors] = useState({})
    const [canvasWidth, setCanvasWidth] = useState(0)
    const [dataWidth,setDataWidth]= useState(0)
    useEffect(()=> {
        if (traceData) {
            let executionRecord = traceData.filter((d) => d.category === "Execution" && d.name === "run")
            let filteredData = showExecutionOnly ?  traceData.filter((d) => d.start >= executionRecord[0].start && d.start <= executionRecord[0].start + executionRecord[0].duration) : traceData
            let analyzedData = filteredData.reduce((acc, d) => {
                let event = d
                if (!acc[d.tid]) {
                    acc[d.tid] = []
                }
                for (let i = 0; i < acc[d.tid].length; i++) {
                    let lastElementInRow = acc[d.tid][i][acc[d.tid][i].length - 1]
                    let end = lastElementInRow.start + lastElementInRow.duration
                    if (d.start >= end) {
                        acc[d.tid][i].push(event)
                        return acc
                    }
                }
                acc[d.tid].push([event])
                return acc
            }, {})
            let numRows = 0
            let maxTime = 0
            let minTime = filteredData.reduce((acc, d) => Math.min(acc, d.start), Infinity)
            let categoryColors = {}
            let data = []
            let threads = []
            for (let tid in analyzedData) {
                threads.push({"threadId": tid, "startRow": numRows})
                for (let row in analyzedData[tid]) {
                    for (let entryIdx in analyzedData[tid][row]) {
                        let entry = analyzedData[tid][row][entryIdx]
                        maxTime = Math.max(maxTime, entry.start + entry.duration - minTime)
                        if (entry.category) {
                            if (!categoryColors[entry.category + "::" + entry.name]) {
                                let idx = Object.keys(categoryColors).length % baseColors.length
                                categoryColors[entry.category + "::" + entry.name] = baseColors[idx]
                            }
                        }
                        data.push({...entry, start: entry.start - minTime, duration: entry.duration, row: numRows,})
                    }
                    numRows++
                }
            }
            setData(data)
            const newScaleX = dataWidth / maxTime;
            setScaleX(newScaleX)
            setInitialScaleX(newScaleX)
            setTimeRange([0, maxTime])
            setMaxTime(maxTime)
            setThreads(threads)
            setCategoryColors(categoryColors)
        }
    },[traceData,showExecutionOnly,dataWidth])

    let offsetY = 20
    let offsetX = 100
    let rowOffset = 20;
    useEffect(() => {
        setCanvasWidth(width - 20)
        setDataWidth(width - 20 - offsetX)
    }, [width]);
    const [selectedEvent, setSelectedEvent] = useState(null)
    const selectEvent = (event) => {
        setSelectedEvent(event)
        onSelect(event)
    }
    const formatExtraText = (d) => {
        let extra = []
        for (let prop in d.extra) {
            extra.push({key: prop, value: d.extra[prop]})
        }
        let extraText = extra.map((d, i) => {
            return `${d.key}: ${d.value}`
        }).join(", ")
        return extraText
    }
    const handleScroll = (e) => {
        if (e.evt.ctrlKey) {
            e.evt.preventDefault();
            let layerX = e.evt.layerX-offsetX
            let timePosition = layerX / scaleX + timeRange[0]
            let factor = e.evt.wheelDelta / 100;
            let newScaleX = factor > 0 ? scaleX * factor : scaleX / -factor;
            if (newScaleX < initialScaleX) {
                setScaleX(initialScaleX)
                setTimeRange([0, maxTime])
            } else {
                let newPositionOfScrolledPoint = (timePosition - timeRange[0]) * newScaleX
                let diff = layerX - newPositionOfScrolledPoint
                var newTimeStart = timeRange[0] - diff / newScaleX
                var newTimeEnd = newTimeStart + dataWidth / newScaleX
                if (newTimeEnd > maxTime) {
                    newTimeStart -= newTimeEnd - maxTime
                    newTimeEnd = maxTime
                }
                let newTimeRange = [newTimeStart, newTimeEnd]
                setScaleX(newScaleX)
                setTimeRange(newTimeRange)
            }
        }
    }

    const [mouseDownLocation, setMouseDownLocation] = useState(null)
    const handleMouseDown = (e) => {
        setMouseDownLocation(e.evt.layerX)
    }
    const handleMouseUp = (e) => {
        if (mouseDownLocation) {
            let diff = e.evt.layerX - mouseDownLocation;
            let newTimeStart = timeRange[0] - diff / scaleX
            let newTimeEnd = newTimeStart + dataWidth / scaleX
            if (newTimeStart < 0) {
                newTimeStart = 0
                newTimeEnd = dataWidth / scaleX
            }
            if (newTimeEnd > maxTime) {
                newTimeStart -= newTimeEnd - maxTime
                newTimeEnd = maxTime
            }
            setTimeRange([newTimeStart, newTimeEnd])
            setMouseDownLocation(null)
        }
    }
    const handleMouseMove = (e) => {
        if (mouseDownLocation) {
            let diff = e.evt.layerX - mouseDownLocation;
            let newTimeStart = timeRange[0] - diff / scaleX
            let newTimeEnd = newTimeStart + dataWidth / scaleX
            if (newTimeStart < 0) {
                newTimeStart = 0
                newTimeEnd = dataWidth / scaleX
            }
            if (newTimeEnd > maxTime) {
                newTimeStart -= newTimeEnd - maxTime
                newTimeEnd = maxTime
            }
            setTimeRange([newTimeStart, newTimeEnd])
            setMouseDownLocation(e.evt.layerX)
        }
    }
    const [rows, setRows] = useState([]);


    function roundUpToStepSize(value) {
        const magnitude = Math.pow(10, Math.floor(Math.log10(value)));  // Find the magnitude of the value
        const normalized = value / magnitude;  // Normalize the value to the range [1, 10)

        let step;
        if (normalized <= 1) {
            step = 1;
        } else if (normalized <= 2) {
            step = 2;
        } else if (normalized <= 5) {
            step = 5;
        } else {
            step = 10;
        }

        return step * magnitude;
    }

    const [splitters, setSplitters] = useState([])
    const [splitterStep, setSplitterStep] = useState(0)
    useEffect(() => {
        let numSplitters = dataWidth / 200;
        let timeDuration = timeRange[1] - timeRange[0]
        let timeStep = roundUpToStepSize(timeDuration / numSplitters)
        let firstSplitter = Math.ceil(timeRange[0] / timeStep) * timeStep
        let newSplitters = []
        for (let i = firstSplitter; i < timeRange[1]; i += timeStep) {
            newSplitters.push(i)
        }
        setSplitters(newSplitters)
        setSplitterStep(timeStep)

    }, [timeRange]);
    const formatTime = (time) => {
        if (time < 1000) {
            return `${time} us`
        } else if (time < 1000000) {
            return `${time / 1000} ms`
        } else {
            return `${time / 1000000} s`
        }
    }
    //useEffect(() => {
    //    doTest();
    //}, []);
    return (
        <div>
            <div style={{maxHeight: height-60, overflowY: "auto"}}>
                <Stage width={canvasWidth} height={window.innerHeight}
                       onWheel={(e) => handleScroll(e)} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
                       onMouseMove={handleMouseMove}>
                    <Layer>
                        {
                            threads.map((t, i) => <Group>
                                <Rect x={0} y={offsetY + t.startRow * rowOffset - 2} width={canvasWidth} height={1}
                                      fill={"black"}></Rect>
                                <Text x={0} y={offsetY + t.startRow * rowOffset} text={"Thread " + t.threadId}
                                      fontSize={14} fill={"black"}></Text>
                            </Group>)
                        }
                        {
                            splitters.map((d, i) => <Group>
                                <Rect x={offsetX + (d - timeRange[0]) * scaleX} y={0} width={1}
                                      height={window.innerHeight} fill={"black"}></Rect>
                                <Text x={offsetX + (d - timeRange[0]) * scaleX} y={0}
                                      text={`${formatTime(d)}    step: ${formatTime(splitterStep)}`} fontSize={14}
                                      fill={"black"}></Text>
                            </Group>)

                        }
                        {data.map((d, i) => {
                                let duration = d.duration
                                if (d.start + duration < timeRange[0] || d.start > timeRange[1]) {
                                    return null
                                } else {
                                    let correctedStart = d.start < timeRange[0] ? 0 : d.start - timeRange[0]
                                    var correctedDuration = d.start < timeRange[0] ? duration - (timeRange[0] - d.start) : duration
                                    correctedDuration = d.start + duration > timeRange[1] ? duration - (d.start + duration - timeRange[1]) : correctedDuration
                                    if (duration == 0) {
                                        return <Circle x={correctedStart * scaleX+offsetX} y={d.row * rowOffset+offsetY} radius={2} fill={"black"} onClick={()=> selectEvent(d)}></Circle>
                                    } else {
                                        let extraText = formatExtraText(d)
                                        return (<Group onClick={() => selectEvent(d)}>
                                            <Rect x={offsetX + correctedStart * scaleX} y={offsetY + d.row * rowOffset} height={15}
                                                  width={correctedDuration * scaleX}
                                                  fill={d.category=== "Ignore" ? "white":categoryColors[d.category + "::" + d.name]} stroke={"gray"} strokeWidth={0.4}
                                                  onClick={() => console.log(d)}></Rect>

                                            <Text x={offsetX + correctedStart * scaleX} y={offsetY + d.row * rowOffset}
                                                  text={`${d.name} (${extraText})`}
                                                  width={correctedDuration * scaleX} fontSize={14} fill={"white"} wrap={"none"}
                                                  ellipsis={true}></Text>
                                            {d.category === "Ignore" &&
                                                <Group>
                                                    <Line points={[offsetX + correctedStart * scaleX,offsetY + d.row * rowOffset,offsetX + correctedStart * scaleX+correctedDuration*scaleX,offsetY + d.row * rowOffset+15]} stroke={"red"} strokeWidth={1}></Line>
                                                    <Line points={[offsetX + correctedStart * scaleX,offsetY + d.row * rowOffset+15,offsetX + correctedStart * scaleX+correctedDuration*scaleX,offsetY + d.row * rowOffset]} stroke={"red"} strokeWidth={1}></Line>
                                                </Group>
                                            }
                                        </Group>)
                                    }
                                }
                            }
                        )}
                    </Layer>
                </Stage>
            </div>
            <div>
                <input type="checkbox" checked={showExecutionOnly} onChange={(e) => setShowExecutionOnly(e.target.checked)}/> Show Execution Only
                {selectedEvent &&
                    <div style={{display:"inline"}}><b>Selected Element:</b> Category: {selectedEvent.category} Name: {selectedEvent.name} Duration: {formatTime(selectedEvent.duration)} Metadata: {formatExtraText(selectedEvent)}
                    </div>

                }
            </div>
        </div>
    );
}
