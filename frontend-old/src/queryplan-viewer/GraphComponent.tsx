import React, {createRef} from 'react';
import dagre from 'dagre';
import * as d3 from 'd3';
import dagreD3 from 'dagre-d3';

import {PlanGraphElement} from './NormalizePlan';

import classNames from 'classnames';
import s from './GraphComponent.module.scss';

interface IGraphComponentProps {
    /** Result node with children */
    rootElement: PlanGraphElement;
    /** Function to execute on click on blank space */
    onSvgClick?: () => void;
    /** Function to execute on click on node */
    onNodeClick?: (node: dagreD3.Node) => void;
}

/**
 * Component rendering SVG graph
 */
export default class GraphComponent extends React.PureComponent<IGraphComponentProps> {
    /** reference to d3 SVG DOM node */
    private svg = createRef<SVGSVGElement>();
    /** reference to d3 SVG grouping DOM node */
    private innerG = createRef<SVGSVGElement>();
    /** d3 zoom functionality as class attribute to allow external zooming */
    private zoom = d3.zoom();

    /**
     * create dagre graph and render it using d3
     */
    drawChart: () => void = () => {
        // create empty dagre graph and fill with nodes
        const g = new dagreD3.graphlib.Graph().setGraph({nodesep: 30, ranksep: 30});
        this.fillGraph(g, this.props.rootElement);
        dagre.layout(g);

        const render = new dagreD3.render();

        // define new empty arrow type for undirected edges
        render.arrows().none = () => {
        };

        const svg: any = d3.select(this.svg.current!);
        const inner: any = d3.select(this.innerG.current!);

        // reset zoom
        svg.call(this.zoom.transform, d3.zoomIdentity);

        // render dagre graph with dagre-d3
        render(inner, g);

        // zoom functionality
        const svgBB = this.svg.current!.getBoundingClientRect();
        const innerBB = this.innerG.current!.getBoundingClientRect();
        const scale = Math.min(svgBB.width / innerBB.width, svgBB.height / (innerBB.height + 60));
        const xOffset = (svgBB.width - innerBB.width) / 2;
        const yOffset = (svgBB.height - innerBB.height) / 2;

        this.zoom
            .scaleExtent([scale, Infinity])
            .on('zoom', () => {
                inner.attr('transform', d3.event.transform);
            });
        svg.call(this.zoom);

        svg.call(this.zoom.translateBy, xOffset, yOffset)
            .call(this.zoom.scaleTo, scale);


        const nodeSelection = svg.selectAll('g.node');

        // pass SVG click to prop function
        if (this.props.onSvgClick) {
            svg.on('click', this.props.onSvgClick);
        }

        // round node corners, limit border to top side
        nodeSelection.selectAll('rect')
            .attr('rx', 5)
            .attr('ry', 5)
            .each((d: any, i: number, nodes: any[]) => {
                d3.select(nodes[i]).attr('stroke-dasharray', nodes[i].getAttribute('width') - 10 + ',9999');
            });

        // pass node click to prop function
        if (this.props.onNodeClick) {
            nodeSelection.on('click', (id: any) => {
                d3.event.stopPropagation();
                const node = g.node(id);
                this.props.onNodeClick!(node);
            });
        }
    };

    /**
     * Create node and edges for current element,
     * call recursively for children
     * @param g graph to fill with nodes and edges
     * @param element current {@link PlanGraphElement}
     */
    private fillGraph(g: dagreD3.graphlib.Graph, element: PlanGraphElement): void {
        // constants for edge width
        const minCardinality = Math.log(this.props.rootElement.node.data.minCardinality);
        const maxCardinality = Math.log(this.props.rootElement.node.data.maxCardinality);
        const cardinalitySlope = (20 - 1) / (maxCardinality - minCardinality);

        // constants for node border width
        const minDuration = Math.log(this.props.rootElement.node.data.minDuration);
        const maxDuration = Math.log(this.props.rootElement.node.data.maxDuration);
        const durationSlope = (20 - 1) / (maxDuration - minDuration);

        // create current node
        g.setNode(element.node.id, Object.assign(element.node.data, {
            class: s.node,
            style: (element.node.data.pipelineColor ? `stroke: ${element.node.data.pipelineColor};` : '')
                + (element.node.data.duration ? `stroke-width: ${(Math.log(element.node.data.duration) - minDuration) * durationSlope + 1}px;` : '')
        }));
        if (!element.node.data.collapsed) {
            // create edges to children
            element.children.forEach(child => {
                this.fillGraph(g, child);
                const {analyzePlanCardinality, cardinality} = child.node.data.planNodeProperties;
                const newCardinality = undefined !== analyzePlanCardinality ? analyzePlanCardinality : cardinality;
                g.setEdge(element.node.id, child.node.id, {
                    class: s.edgePath,
                    curve: d3.curveMonotoneY,
                    labelpos: 'r',
                    labeloffset: 30,
                    arrowhead: 'none',
                    style: `stroke-width: ${(Math.log(newCardinality) - minCardinality) * cardinalitySlope + 1}px;`
                        + 'fill: none;'
                        + (child.node.data.pipelineColor
                            ? `stroke: ${child.node.data.pipelineColor};` : ''),
                    label: child.node.data.cardinalityString !== undefined ? child.node.data.cardinalityString : ''
                });
            });
        }
        // create dashed edges
        if (element.scannedOperator) {
            g.setEdge(element.node.id, element.scannedOperator, {
                class: classNames(s.edgePath, s.edgeRef),
                curve: d3.curveMonotoneY,
                arrowhead: 'none',
                label: ''
            });
        }
        if (element.earlyprobe) {
            g.setEdge(element.earlyprobe, element.node.id, {
                class: classNames(s.edgePath, s.edgeRef),
                curve: d3.curveMonotoneY,
                arrowhead: 'none',
                label: ''
            });
        }
    }

    componentDidMount(): void {
        this.drawChart();
    }
    componentDidUpdate(prevProps: Readonly<IGraphComponentProps>): void {
        this.drawChart();
    }

    render(): JSX.Element {
        return (
            <svg className={s.svg} width="100%" height="100%" ref={this.svg}>
                <g ref={this.innerG}/>
            </svg>
        );
    }

    // handle external zoom
    zoomIn(): void {
        d3.select(this.svg.current!).transition().duration(100).call(this.zoom.scaleBy as any, 2);
    }

    zoomOut(): void {
        d3.select(this.svg.current!).transition().duration(100).call(this.zoom.scaleBy as any, .5);
    }
}
