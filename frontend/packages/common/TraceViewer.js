import {useEffect, useState, useMemo} from "react";
import Konva from "konva";
import {Circle, Group, Layer, Line, Rect, Stage, Text} from "react-konva";




function createStripePattern(color) {
    const size = 12;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // colored background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // semi-transparent white diagonal stripes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // wrap-around stripes for seamless tiling
    ctx.beginPath();
    ctx.moveTo(-size / 2, size / 2);
    ctx.lineTo(size / 2, -size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size / 2, size * 1.5);
    ctx.lineTo(size * 1.5, size / 2);
    ctx.stroke();

    return canvas;
}



const baseColors = ['hsl(4, 72%, 63.8%)', 'hsl(340, 65.6%, 57.2%)', 'hsl(291, 51.2%, 46.2%)', 'hsl(262, 41.6%, 51.7%)', 'hsl(231, 38.4%, 52.8%)', 'hsl(207, 72%, 59.4%)', 'hsl(199, 78.4%, 52.8%)', 'hsl(187, 80%, 46.2%)', 'hsl(174, 80%, 31.9%)', 'hsl(122, 31.2%, 53.9%)', 'hsl(88, 40%, 58.3%)', 'hsl(66, 56%, 59.4%)', 'hsl(45, 80%, 56.1%)', 'hsl(36, 80%, 55%)', 'hsl(14, 80%, 62.7%)', 'hsl(16, 20%, 41.8%)', 'hsl(200, 14.4%, 50.6%)', 'hsl(54, 80%, 68.2%)']

export const TraceViewer = ({traceData,width, height, onSelect}) => {
    const [showExecutionOnly, setShowExecutionOnly] = useState(true)
    const [data, setData] = useState([])
    let [scaleX, setScaleX] = useState(1);
    let [timeRange, setTimeRange] = useState([0, 1]);
    let [initialScaleX, setInitialScaleX] = useState(1)
    const [maxTime, setMaxTime] = useState(1)
    const [threads, setThreads] = useState([])
    const [categoryColors, setCategoryColors] = useState({})
    const stripePatterns = useMemo(() => {
        const patterns = {};
        for (let key in categoryColors) {
            patterns[key] = createStripePattern(categoryColors[key]);
        }
        return patterns;
    }, [categoryColors]);
    const [canvasWidth, setCanvasWidth] = useState(0)
    const [dataWidth,setDataWidth]= useState(0)
    useEffect(()=> {
        if (traceData) {
            let executionRecord = traceData.filter((d) => d.category === "Execution" && d.name === "run")
            let filteredData = showExecutionOnly ?  traceData.filter((d) => !(d.category === "Execution" && d.name === "run")&&d.start >= executionRecord[0].start && d.start <= executionRecord[0].start + executionRecord[0].duration) : traceData
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
                        //true if entry has member runtime that is true
                        let isRuntimePart =  entry.runtime && entry.runtime===true
                        data.push({...entry, start: entry.start - minTime, duration: entry.duration, row: numRows, runtimePart: isRuntimePart})
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
        if (event.category === "Execution" && event.name === "Step") {
            onSelect(event)
        }else{
            data.filter((d) => d.category === "Execution" && d.name === "Step" && d.start<=event.start && d.start+d.duration>=event.start+event.duration).forEach((d) => onSelect(d))
        }
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
    const [lastTouchX, setLastTouchX] = useState(null)

    const handleTouchStart = (e) => {
        if (e.evt.touches.length === 1) {
            setLastTouchX(e.evt.touches[0].clientX);
        }
    }
    const [lastPinchDistance, setLastPinchDistance] = useState(null);
    const handleTouchMove = (e) => {
        const touches = e.evt.touches;

        if (touches.length === 2) {
            e.evt.preventDefault(); // Prevent page scroll

            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const layerX = centerX - offsetX;
            const timePosition = layerX / scaleX + timeRange[0];

            if (lastPinchDistance) {
                const scaleFactor = distance / lastPinchDistance;
                let newScaleX = scaleX * scaleFactor;

                if (newScaleX < initialScaleX) {
                    newScaleX = initialScaleX;
                    setScaleX(newScaleX);
                    setTimeRange([0, maxTime]);
                } else {
                    const newPosition = (timePosition - timeRange[0]) * newScaleX;
                    const diff = layerX - newPosition;
                    let newTimeStart = timeRange[0] - diff / newScaleX;
                    let newTimeEnd = newTimeStart + dataWidth / newScaleX;

                    if (newTimeEnd > maxTime) {
                        newTimeStart -= newTimeEnd - maxTime;
                        newTimeEnd = maxTime;
                    }

                    if (newTimeStart < 0) {
                        newTimeStart = 0;
                        newTimeEnd = dataWidth / newScaleX;
                    }

                    setScaleX(newScaleX);
                    setTimeRange([newTimeStart, newTimeEnd]);
                }
            }

            setLastPinchDistance(distance);
        } else if (touches.length === 1 && lastTouchX !== null) {
            // one-finger pan
            const currentX = touches[0].clientX;
            const deltaX = currentX - lastTouchX;

            let newTimeStart = timeRange[0] - deltaX / scaleX;
            let newTimeEnd = newTimeStart + dataWidth / scaleX;

            if (newTimeStart < 0) {
                newTimeStart = 0;
                newTimeEnd = dataWidth / scaleX;
            }
            if (newTimeEnd > maxTime) {
                newTimeStart -= newTimeEnd - maxTime;
                newTimeEnd = maxTime;
            }

            setTimeRange([newTimeStart, newTimeEnd]);
            setLastTouchX(currentX);
        }
    }


    const handleTouchEnd = () => {
        setLastTouchX(null);
        setLastPinchDistance(null);
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
            <div
                style={{
                    maxHeight: height - 60,
                    overflowY: "auto",
                    //touchAction: "none", // prevent browser gestures like zoom
                    WebkitOverflowScrolling: "touch" // keep native scrolling on parent
                }}
                title={"CTRL+Scroll for Zooming, Drag and Drop for Moving"}
            >                <Stage
                    renderPixelRatio={window.devicePixelRatio}
                    width={canvasWidth}
                    height={window.innerHeight}
                    onWheel={(e) => handleScroll(e)}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
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
                                        return <Circle x={correctedStart * scaleX+offsetX} y={d.row * rowOffset+offsetY} radius={2} fill={"black"} onClick={()=> selectEvent(d)} onTap={()=>selectEvent(d)}></Circle>
                                    } else {
                                        return (<Group onClick={() => selectEvent(d)}  onTap={()=>selectEvent(d)}>
                                            {
                                                <Rect x={offsetX + correctedStart * scaleX} y={offsetY + d.row * rowOffset} height={15}
                                                  width={correctedDuration * scaleX}
                                                  cornerRadius = {3}
                                                  fill={d.category === "Ignore" ? "white" : d.runtimePart? undefined: categoryColors[d.category + "::" + d.name]}
                                                  fillPatternImage={d.runtimePart? stripePatterns[d.category + "::" + d.name]:undefined}
                                                  stroke={"gray"} strokeWidth={0.4}
                                                  onClick={() => {}} onTap={()=>{}}></Rect>
                                            }

                                            <Text x={offsetX + correctedStart * scaleX} y={offsetY + d.row * rowOffset}
                                                  text={`${d.name}`}
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
                {selectedEvent &&
                    <div style={{display:"inline"}}><b><i>{selectedEvent.category}::{selectedEvent.name}</i></b>: {formatTime(selectedEvent.duration)}
                    </div>

                }
            </div>
        </div>
    );
}
