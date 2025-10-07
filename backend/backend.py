import os
from time import sleep

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import re
import json
import subprocess
import tempfile
import sys
import resource
import os

DATA_ROOT = os.environ['DATA_ROOT']  # "/home/michael/projects/code/resources/data/"
BINARY_DIR = os.environ['LINGODB_BINARY_DIR']  # "/home/michael/projects/code/build/lingodb-release/"
SCRIPT_DIR = os.environ['LINGODB_SCRIPT_DIR']  # "/home/michael/projects/code/build/lingodb-release/"
app = FastAPI()
api_app = FastAPI(title="api app")
if "WEBINTERFACE_LOCAL" in os.environ:
    api_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Replace with a list of allowed origins, or use ["*"] to allow all origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

memory_limit =(int)  (6 * 1024 * 1024 * 1024)
resource.setrlimit(resource.RLIMIT_RSS, (memory_limit, memory_limit))


def table_to_json(raw_table):
    # Split the raw data into rows
    rows = re.split(r'\n', raw_table.strip())

    # Extract the header row and remove whitespace
    header = [col.strip() for col in re.findall(r'\|\s*(.*?)\s*(?=\|)', rows[0])]

    # Extract the data rows and remove whitespace
    data_rows = [re.findall(r'\|\s*(.*?)\s*(?=\|)', row) for row in rows[2:]]

    result_dict = {"columns": header, "rows": data_rows}
    # Convert the list of dictionaries to a JSON object
    return result_dict


def run_sql_query(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(query_str)
        query_file = f.name
    print(query_str)
    try:
        # Build command string
        cmd = [BINARY_DIR + "run-sql", query_file,
               DATA_ROOT + db]

        # Execute command and capture output
        output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT, timeout=20,
                                         env={**os.environ,"LINGODB_PARALLELISM": "4"})
        # Parse output and skip first and last 4 lines
        splitted = output.split("\n")
        execution_has_error=False
        if len(splitted) < 2:
            execution_has_error=True
        header_list = splitted[-2].split()
        if not "total" in header_list or not "name" in header_list:
            execution_has_error=True
        if execution_has_error:
            cleaned_output = "\n".join(output.split("\n")[1:])
            cleaned_output= cleaned_output.replace(f.name+":", "")
            cleaned_output= cleaned_output.replace(f.name, "<query_file>")
            raise HTTPException(status_code=400, detail=cleaned_output)
        times_list = splitted[-1].split()
        query_opt_time=float(times_list[1])
        execution_time=float(times_list[-2])
        compilation_time = sum(float(t) for t in times_list[2:-1])
        result = "\n".join(splitted[1:-4])
        table_as_json = table_to_json(raw_table=result)
        return {"result": table_as_json, "timing": {
            "compilation": compilation_time,
            "execution": execution_time,
            "qopt": query_opt_time
        }}

    except subprocess.CalledProcessError as e:
        # Print error message to stderr
        print(e.output, file=sys.stderr)
        cleaned_output =  e.output.replace(f.name + ":", "")
        cleaned_output = cleaned_output.replace(f.name, "<query_file>")
        raise HTTPException(status_code=400, detail="Query execution failed (not expected) with following error:\n"+cleaned_output)
    except subprocess.TimeoutExpired as e:
        raise HTTPException(status_code=400, detail="Query took too long")

    finally:
        # Delete temporary file
        if query_file:
            os.remove(query_file)


@api_app.post("/analyze")
async def analyze(database: str = Body(...), query: str = Body(...), real_card: bool = Body(...)):
    if database not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise RuntimeError("Unknown Database")
    try:
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write(query)
            query_file = f.name
            f.flush()
            with tempfile.TemporaryDirectory() as snapshotdir:
                print(BINARY_DIR + "run-sql " + query_file + " " + DATA_ROOT + database)
                output = subprocess.check_output([BINARY_DIR + "run-sql", query_file, DATA_ROOT + database],
                                                 universal_newlines=True, stderr=subprocess.STDOUT, timeout=20,
                                                 env={**os.environ,"LINGODB_SNAPSHOT_DIR": snapshotdir,
                                                      "LINGODB_SNAPSHOT_PASSES": "true",
                                                      "LINGODB_SNAPSHOT_LEVEL": "important",
                                                      "LINGODB_EXECUTION_MODE": "NONE"})
                result = subprocess.run(
                    f"bash {SCRIPT_DIR}/clean-snapshot.sh {BINARY_DIR} {snapshotdir}/important-snapshot-qopt.mlir {snapshotdir}/important-snapshot-qopt.mlir.alt",
                    universal_newlines=True, stderr=subprocess.STDOUT, shell=True)
                print(result)
                result = subprocess.run(
                    f"bash {SCRIPT_DIR}/clean-snapshot.sh {BINARY_DIR} {snapshotdir}/important-snapshot-subop-opt.mlir  {snapshotdir}/important-snapshot-subop-opt.mlir.alt",
                    universal_newlines=True, stderr=subprocess.STDOUT, shell=True)
                print(os.listdir(snapshotdir))

                relalg_plan = subprocess.check_output(
                    [BINARY_DIR + "mlir-to-json", snapshotdir + "/important-snapshot-qopt.mlir.alt"] + (
                        [DATA_ROOT + database] if real_card else []),
                    universal_newlines=True, stderr=subprocess.STDOUT)
                subop_plan = subprocess.check_output(
                    [BINARY_DIR + "mlir-subop-to-json", snapshotdir + "/important-snapshot-subop-opt.mlir.alt"],
                    universal_newlines=True)
                analyzed_snapshots = subprocess.check_output(
                    [BINARY_DIR + "mlir-analyze-snapshots", snapshotdir + "/important-snapshot-info.json"],
                    universal_newlines=True)
                print(os.listdir(snapshotdir))
                return {"plan": json.loads(relalg_plan.split("\n")[0]), "subopplan": json.loads(subop_plan.split("\n")[0]),
                        "mlir": json.loads(analyzed_snapshots)}
    except Exception as e:
        print(e, file=sys.stderr)
        raise HTTPException(status_code=400, detail="Error during query analyze")
    return {}


@api_app.post("/execute")
async def execute(database: str = Body(...), query: str = Body(...)):
    return run_sql_query(query, database)


app.mount("/api", api_app)
if "WEBINTERFACE_LOCAL" not in os.environ:
    app.mount("/", StaticFiles(directory="/webinterface/frontend", html=True), name="frontend")
