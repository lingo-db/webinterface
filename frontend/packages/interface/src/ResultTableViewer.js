import {Table, Spinner} from "react-bootstrap";

export const ResultTableViewer = ({result, loading, error}) => {

    if (loading) {
        return (
            <div style={{height: '50vh', overflow: 'auto', textAlign: "center"}}>
                <Spinner animation="border" variant="primary"/>
            </div>)
    } else if (error) {
        return (
            <div style={{height: '50vh', overflowY: 'auto', maxWidth:"100vw"}}>
                An Error occurred:
                <pre>
                    {error}
                </pre>
            </div>
        )
    } else if (result) {
        const timing = result.timing

        return (
            <div style={{height: '50vh', overflow: 'auto'}}>
                <p style={{marginTop:10,textAlign:'center'}}><b>Execution:</b> {(timing.execution).toFixed(1)} ms &nbsp;&nbsp; <b>Optimization:</b> {(timing.qopt).toFixed(1)} ms &nbsp;&nbsp;
                    <b>Compilation:</b> {(timing.compilation).toFixed(1)} ms</p>

                <Table striped bordered>
                    <thead>
                    <tr>
                        {result.result.columns.map((column,index) => (
                            <th key={index}>{column}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {result.result.rows.map((row, index) => (
                        <tr key={index}>
                            {row.map((cell, index) => (
                                <td key={index}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>
        );
    } else {
        return null
    }
};