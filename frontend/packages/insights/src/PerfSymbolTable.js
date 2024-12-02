import {Table} from "react-bootstrap";

export const PerfSymbolTable = ({data})=>{
    return (
        <div style={{height: '50vh', overflow: 'auto'}}>
            <Table striped bordered>
                <thead>
                <tr>
                    <th>File</th>
                    <th>Symbol</th>
                    <th>Percentage</th>

                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => (
                    <tr key={index}>
                        <td >{row.file}</td>
                        <td >{row.symbol}</td>
                        <td >{(row.percentage*100).toFixed(1)}</td>

                    </tr>
                ))}
                </tbody>
            </Table>
        </div>
    );
}