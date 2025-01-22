import 'bootstrap/dist/css/bootstrap.min.css';
import {CloseButton, Col, Container, Form, Nav, Navbar, Row} from 'react-bootstrap';
import {TraceViewer} from "@lingodb/common/TraceViewer";


export const TraceOnlyView = ({data, onClose}) => {


    //return <TraceViewer></TraceViewer>
    return (
        <div>

            <Navbar bg="light"  fixed="top">
                <Nav className="ml-auto" style={{paddingLeft:10}}>
                <Navbar.Brand href="#">TraceViewer</Navbar.Brand>
                </Nav>
                <Nav className="ms-auto" style={{paddingRight:10}}>
                    <Form >
                        <CloseButton onClick={onClose}/>
                    </Form>
                </Nav>


            </Navbar>
                <Container fluid className="pt-5 mt-3">
                    <Row>
                        <Col className="p-3"
                             style={{height: (window.innerHeight - 80), backgroundColor: '#f8f9fa'}}>
                            {data &&
                                <TraceViewer height={(window.innerHeight - 80) } width={window.innerWidth - 20}
                                             traceData={data.trace} onSelect={()=>{}}></TraceViewer>}
                        </Col>
                    </Row>
                </Container>
        </div>
    );
}
