FROM ubuntu:latest
RUN apt-get update && apt-get install -y python3-pip python3-venv
ENV VIRTUAL_ENV=/root/venv
RUN python3 -m venv $VIRTUAL_ENV
RUN $VIRTUAL_ENV/bin/pip install fastapi uvicorn pyarrow===14.0.0 tbb-devel==2021.11.0
ENV DATA_ROOT="/data/"
ENV LINGODB_BINARY_DIR="/lingodb/"
ENV LINGODB_SCRIPT_DIR="/scripts/"
ENV LD_LIBRARY_PATH=$VIRTUAL_ENV/lib:$VIRTUAL_ENV/lib/python3.12/site-packages/pyarrow:$LD_LIBRARY_PATH
RUN mkdir /webinterface
COPY backend/backend.py /webinterface/backend.py
COPY docker-build/frontend /webinterface/frontend
COPY docker-build/lingodb-binaries /lingodb
RUN mkdir /scripts
COPY clean-snapshot.sh /scripts/clean-snapshot.sh
RUN find /webinterface
WORKDIR /webinterface
ENTRYPOINT ["/root/venv/bin/uvicorn" , "backend:app","--host", "0.0.0.0","--port","80"]
