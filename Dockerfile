FROM gitlab.db.in.tum.de:5005/lingo-db/lingo-db/lingodb:latest
RUN pip install fastapi uvicorn
ENV DATA_ROOT="/data/"
ENV LINGODB_BINARY_DIR="/build/lingodb/"
RUN mkdir /webinterface
COPY backend/backend.py /webinterface/backend.py
COPY frontend/build /webinterface/frontend
RUN find /webinterface
WORKDIR /webinterface
ENTRYPOINT ["uvicorn", "backend:app","--host", "0.0.0.0","--port","80"]
