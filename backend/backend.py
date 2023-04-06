import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import re
import json
import subprocess
import tempfile
import sys

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with a list of allowed origins, or use ["*"] to allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a dictionary with some sample data
sample_data = {
    "name": "plan", "plan": {
        "output": [], "plan": {
            "analyzePlanCardinality": 100,
            "analyzePlanId": 2,
            "input": {
                "analyzePlanCardinality": 460,
                "analyzePlanId": 4,
                "cardinality": 390.62500000000006,
                "condition": {
                    "expression": "and",
                    "input": [{
                        "expression": "and",
                        "input": [{
                            "direction": "=",
                            "expression": "compare",
                            "left": {
                                "expression": "iuref",
                                "iu": "part@p_partkey",
                                "type": {"numBits": 32, "signed": False, "type": "numeric"}
                            },
                            "right": {
                                "expression": "iuref",
                                "iu": "partsupp1@ps_partkey",
                                "type": {"numBits": 32, "signed": False, "type": "numeric"}
                            }
                        }]
                    }, {
                        "direction": "=",
                        "expression": "compare",
                        "left": {
                            "expression": "iuref",
                            "iu": "partsupp@ps_supplycost",
                            "type": {"precision": 12, "scale": 2, "type": "numeric"}
                        },
                        "right": {
                            "expression": "iuref",
                            "iu": "singlejoin@sjattr",
                            "type": {"precision": 12, "scale": 2, "type": "numeric"}
                        }
                    }]
                },
                "left": {
                    "analyzePlanId": 5,
                    "cardinality": 390.62500000000006,
                    "condition": {
                        "expression": "and",
                        "input": [{
                            "direction": "=",
                            "expression": "compare",
                            "left": {
                                "expression": "iuref",
                                "iu": "nation@n_nationkey",
                                "type": {"numBits": 32, "signed": False, "type": "numeric"}
                            },
                            "right": {
                                "expression": "iuref",
                                "iu": "supplier@s_nationkey",
                                "type": {"numBits": 32, "signed": False, "type": "numeric"}
                            }
                        }]
                    },
                    "left": {
                        "analyzePlanId": 6,
                        "cardinality": 6.25,
                        "condition": {
                            "expression": "and",
                            "input": [{
                                "direction": "=",
                                "expression": "compare",
                                "left": {
                                    "expression": "iuref",
                                    "iu": "region@r_regionkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                },
                                "right": {
                                    "expression": "iuref",
                                    "iu": "nation@n_regionkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                }
                            }]
                        },
                        "left": {
                            "analyzePlanCardinality": 1,
                            "analyzePlanId": 8,
                            "attributes": [{
                                "iu": "region@primaryKeyHashValue",
                                "name": "primaryKeyHashValue"
                            }, {"iu": "region@r_comment", "name": "r_comment"}, {
                                "iu": "region@r_name",
                                "name": "r_name"
                            }, {"iu": "region@r_regionkey", "name": "r_regionkey"}],
                            "cardinality": 1.25,
                            "operator": "tablescan",
                            "operatorId": 8,
                            "physicalOperator": "tablescan",
                            "residuals": [],
                            "restrictions": [{
                                "attribute": 2,
                                "mode": "=",
                                "value": {
                                    "expression": "const",
                                    "value": {"type": {"type": "text"}, "value": "EUROPE"}
                                }
                            }],
                            "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                            "table": {"id": 0, "type": "table"},
                            "tableSize": 5.0,
                            "tablename": "region",
                            "tableoid": {"type": "tableoid"},
                            "tid": {"iu": "tid", "type": ["type", "bigint"]}
                        },
                        "operator": "join",
                        "operatorId": 6,
                        "physicalOperator": "hashjoin",
                        "right": {
                            "analyzePlanCardinality": 25,
                            "analyzePlanId": 9,
                            "attributes": [{"iu": "nation@n_comment", "name": "n_comment"}, {
                                "iu": "nation@n_name",
                                "name": "n_name"
                            }, {"iu": "nation@n_nationkey", "name": "n_nationkey"}, {
                                               "iu": "nation@n_regionkey",
                                               "name": "n_regionkey"
                                           }, {"iu": "nation@primaryKeyHashValue", "name": "primaryKeyHashValue"}],
                            "cardinality": 25.0,
                            "operator": "tablescan",
                            "operatorId": 9,
                            "physicalOperator": "tablescan",
                            "residuals": [],
                            "restrictions": [],
                            "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                            "table": {"id": 0, "type": "table"},
                            "tableSize": 25.0,
                            "tablename": "nation",
                            "tableoid": {"type": "tableoid"},
                            "tid": {"iu": "tid", "type": ["type", "bigint"]}
                        },
                        "type": "inner"
                    },
                    "operator": "join",
                    "operatorId": 5,
                    "physicalOperator": "hashjoin",
                    "right": {
                        "analyzePlanId": 10,
                        "cardinality": 1562.5000000000002,
                        "condition": {
                            "expression": "and",
                            "input": [{
                                "direction": "=",
                                "expression": "compare",
                                "left": {
                                    "expression": "iuref",
                                    "iu": "partsupp@ps_suppkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                },
                                "right": {
                                    "expression": "iuref",
                                    "iu": "supplier@s_suppkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                }
                            }]
                        },
                        "left": {
                            "analyzePlanId": 11,
                            "cardinality": 1562.5000000000002,
                            "condition": {
                                "expression": "and",
                                "input": [{
                                    "direction": "=",
                                    "expression": "compare",
                                    "left": {
                                        "expression": "iuref",
                                        "iu": "part@p_partkey",
                                        "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                    },
                                    "right": {
                                        "expression": "iuref",
                                        "iu": "partsupp@ps_partkey",
                                        "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                    }
                                }]
                            },
                            "left": {
                                "analyzePlanCardinality": 747,
                                "analyzePlanId": 14,
                                "attributes": [{"iu": "part@p_brand", "name": "p_brand"}, {
                                    "iu": "part@p_comment",
                                    "name": "p_comment"
                                }, {"iu": "part@p_container", "name": "p_container"}, {
                                                   "iu": "part@p_mfgr",
                                                   "name": "p_mfgr"
                                               }, {"iu": "part@p_name", "name": "p_name"}, {
                                                   "iu": "part@p_partkey",
                                                   "name": "p_partkey"
                                               }, {"iu": "part@p_retailprice", "name": "p_retailprice"}, {
                                                   "iu": "part@p_size",
                                                   "name": "p_size"
                                               }, {"iu": "part@p_type", "name": "p_type"}, {
                                                   "iu": "part@primaryKeyHashValue",
                                                   "name": "primaryKeyHashValue"
                                               }],
                                "cardinality": 390.625,
                                "operator": "tablescan",
                                "operatorId": 14,
                                "physicalOperator": "tablescan",
                                "residuals": [],
                                "restrictions": [{
                                    "attribute": 7,
                                    "mode": "=",
                                    "value": {
                                        "expression": "const",
                                        "value": {
                                            "type": {"numBits": 32, "signed": False, "type": "numeric"},
                                            "value": 15
                                        }
                                    }
                                }, {
                                    "attribute": 8,
                                    "mode": "filter",
                                    "value": {
                                        "expression": "like",
                                        "input": [{
                                            "expression": "iuref",
                                            "iu": "part@p_type",
                                            "type": {"type": "text"}
                                        }, {
                                            "expression": "const",
                                            "value": {"type": {"type": "text"}, "value": "%BRASS"}
                                        }]
                                    }
                                }],
                                "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                                "table": {"id": 0, "type": "table"},
                                "tableSize": 200000.0,
                                "tablename": "part",
                                "tableoid": {"type": "tableoid"},
                                "tid": {"iu": "tid", "type": ["type", "bigint"]}
                            },
                            "operator": "join",
                            "operatorId": 11,
                            "physicalOperator": "hashjoin",
                            "right": {
                                "analyzePlanCardinality": 800000,
                                "analyzePlanId": 15,
                                "attributes": [{
                                    "iu": "partsupp@primaryKeyHashValue",
                                    "name": "primaryKeyHashValue"
                                }, {
                                    "iu": "partsupp@ps_availqty",
                                    "name": "ps_availqty"
                                }, {
                                    "iu": "partsupp@ps_comment",
                                    "name": "ps_comment"
                                }, {
                                    "iu": "partsupp@ps_partkey",
                                    "name": "ps_partkey"
                                }, {
                                    "iu": "partsupp@ps_suppkey",
                                    "name": "ps_suppkey"
                                }, {"iu": "partsupp@ps_supplycost", "name": "ps_supplycost"}],
                                "cardinality": 800000.0,
                                "operator": "tablescan",
                                "operatorId": 15,
                                "physicalOperator": "tablescan",
                                "residuals": [],
                                "restrictions": [],
                                "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                                "table": {"id": 0, "type": "table"},
                                "tableSize": 800000.0,
                                "tablename": "partsupp",
                                "tableoid": {"type": "tableoid"},
                                "tid": {"iu": "tid", "type": ["type", "bigint"]}
                            },
                            "type": "inner"
                        },
                        "operator": "join",
                        "operatorId": 10,
                        "physicalOperator": "hashjoin",
                        "right": {
                            "analyzePlanCardinality": 10000,
                            "analyzePlanId": 16,
                            "attributes": [{
                                "iu": "supplier@primaryKeyHashValue",
                                "name": "primaryKeyHashValue"
                            }, {"iu": "supplier@s_acctbal", "name": "s_acctbal"}, {
                                "iu": "supplier@s_address",
                                "name": "s_address"
                            }, {"iu": "supplier@s_comment", "name": "s_comment"}, {
                                "iu": "supplier@s_name",
                                "name": "s_name"
                            }, {"iu": "supplier@s_nationkey", "name": "s_nationkey"}, {
                                "iu": "supplier@s_phone",
                                "name": "s_phone"
                            }, {"iu": "supplier@s_suppkey", "name": "s_suppkey"}],
                            "cardinality": 10000.0,
                            "operator": "tablescan",
                            "operatorId": 16,
                            "physicalOperator": "tablescan",
                            "residuals": [],
                            "restrictions": [],
                            "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                            "table": {"id": 0, "type": "table"},
                            "tableSize": 10000.0,
                            "tablename": "supplier",
                            "tableoid": {"type": "tableoid"},
                            "tid": {"iu": "tid", "type": ["type", "bigint"]}
                        },
                        "type": "inner"
                    },
                    "type": "inner"
                },
                "operator": "join",
                "operatorId": 4,
                "physicalOperator": "hashjoin",
                "right": {
                    "aggregates": [{
                        "arg": 1,
                        "iu": {"iu": "aggr0@tmp_attr0", "type": {"precision": 12, "scale": 2, "type": "numeric"}},
                        "op": "min"
                    }],
                    "analyzePlanCardinality": 0,
                    "analyzePlanId": 17,
                    "cardinality": 200000.0,
                    "groupingsets": [],
                    "input": {
                        "analyzePlanId": 18,
                        "cardinality": 200000.0,
                        "condition": {
                            "expression": "and",
                            "input": [{
                                "direction": "=",
                                "expression": "compare",
                                "left": {
                                    "expression": "iuref",
                                    "iu": "supplier1@s_suppkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                },
                                "right": {
                                    "expression": "iuref",
                                    "iu": "partsupp1@ps_suppkey",
                                    "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                }
                            }]
                        },
                        "left": {
                            "analyzePlanId": 19,
                            "cardinality": 2500.0,
                            "condition": {
                                "expression": "and",
                                "input": [{
                                    "direction": "=",
                                    "expression": "compare",
                                    "left": {
                                        "expression": "iuref",
                                        "iu": "nation1@n_nationkey",
                                        "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                    },
                                    "right": {
                                        "expression": "iuref",
                                        "iu": "supplier1@s_nationkey",
                                        "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                    }
                                }]
                            },
                            "left": {
                                "analyzePlanId": 20,
                                "cardinality": 6.25,
                                "condition": {
                                    "expression": "and",
                                    "input": [{
                                        "direction": "=",
                                        "expression": "compare",
                                        "left": {
                                            "expression": "iuref",
                                            "iu": "region1@r_regionkey",
                                            "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                        },
                                        "right": {
                                            "expression": "iuref",
                                            "iu": "nation1@n_regionkey",
                                            "type": {"numBits": 32, "signed": False, "type": "numeric"}
                                        }
                                    }]
                                },
                                "left": {
                                    "analyzePlanCardinality": 1,
                                    "analyzePlanId": 22,
                                    "attributes": [{
                                        "iu": "region1@primaryKeyHashValue",
                                        "name": "primaryKeyHashValue"
                                    }, {"iu": "region1@r_comment", "name": "r_comment"}, {
                                        "iu": "region1@r_name",
                                        "name": "r_name"
                                    }, {"iu": "region1@r_regionkey", "name": "r_regionkey"}],
                                    "cardinality": 1.25,
                                    "operator": "tablescan",
                                    "operatorId": 22,
                                    "physicalOperator": "tablescan",
                                    "residuals": [],
                                    "restrictions": [{
                                        "attribute": 2,
                                        "mode": "=",
                                        "value": {
                                            "expression": "const",
                                            "value": {"type": {"type": "text"}, "value": "EUROPE"}
                                        }
                                    }],
                                    "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                                    "table": {"id": 0, "type": "table"},
                                    "tableSize": 5.0,
                                    "tablename": "region",
                                    "tableoid": {"type": "tableoid"},
                                    "tid": {"iu": "tid", "type": ["type", "bigint"]}
                                },
                                "operator": "join",
                                "operatorId": 20,
                                "physicalOperator": "hashjoin",
                                "right": {
                                    "analyzePlanCardinality": 25,
                                    "analyzePlanId": 23,
                                    "attributes": [{
                                        "iu": "nation1@n_comment",
                                        "name": "n_comment"
                                    }, {"iu": "nation1@n_name", "name": "n_name"}, {
                                        "iu": "nation1@n_nationkey",
                                        "name": "n_nationkey"
                                    }, {
                                        "iu": "nation1@n_regionkey",
                                        "name": "n_regionkey"
                                    }, {"iu": "nation1@primaryKeyHashValue", "name": "primaryKeyHashValue"}],
                                    "cardinality": 25.0,
                                    "operator": "tablescan",
                                    "operatorId": 23,
                                    "physicalOperator": "tablescan",
                                    "residuals": [],
                                    "restrictions": [],
                                    "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                                    "table": {"id": 0, "type": "table"},
                                    "tableSize": 25.0,
                                    "tablename": "nation",
                                    "tableoid": {"type": "tableoid"},
                                    "tid": {"iu": "tid", "type": ["type", "bigint"]}
                                },
                                "type": "inner"
                            },
                            "operator": "join",
                            "operatorId": 19,
                            "physicalOperator": "hashjoin",
                            "right": {
                                "analyzePlanCardinality": 10000,
                                "analyzePlanId": 24,
                                "attributes": [{
                                    "iu": "supplier1@primaryKeyHashValue",
                                    "name": "primaryKeyHashValue"
                                }, {"iu": "supplier1@s_acctbal", "name": "s_acctbal"}, {
                                    "iu": "supplier1@s_address",
                                    "name": "s_address"
                                }, {"iu": "supplier1@s_comment", "name": "s_comment"}, {
                                    "iu": "supplier1@s_name",
                                    "name": "s_name"
                                }, {
                                    "iu": "supplier1@s_nationkey",
                                    "name": "s_nationkey"
                                }, {"iu": "supplier1@s_phone", "name": "s_phone"}, {
                                    "iu": "supplier1@s_suppkey",
                                    "name": "s_suppkey"
                                }],
                                "cardinality": 10000.0,
                                "operator": "tablescan",
                                "operatorId": 24,
                                "physicalOperator": "tablescan",
                                "residuals": [],
                                "restrictions": [],
                                "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                                "table": {"id": 0, "type": "table"},
                                "tableSize": 10000.0,
                                "tablename": "supplier",
                                "tableoid": {"type": "tableoid"},
                                "tid": {"iu": "tid", "type": ["type", "bigint"]}
                            },
                            "type": "inner"
                        },
                        "operator": "join",
                        "operatorId": 18,
                        "physicalOperator": "hashjoin",
                        "right": {
                            "analyzePlanCardinality": 800000,
                            "analyzePlanId": 25,
                            "attributes": [{
                                "iu": "partsupp1@primaryKeyHashValue",
                                "name": "primaryKeyHashValue"
                            }, {
                                "iu": "partsupp1@ps_availqty",
                                "name": "ps_availqty"
                            }, {"iu": "partsupp1@ps_comment", "name": "ps_comment"}, {
                                "iu": "partsupp1@ps_partkey",
                                "name": "ps_partkey"
                            }, {
                                "iu": "partsupp1@ps_suppkey",
                                "name": "ps_suppkey"
                            }, {"iu": "partsupp1@ps_supplycost", "name": "ps_supplycost"}],
                            "cardinality": 800000.0,
                            "operator": "tablescan",
                            "operatorId": 25,
                            "physicalOperator": "tablescan",
                            "residuals": [],
                            "restrictions": [],
                            "rowstate": {"iu": "rowstate", "type": ["type", "bigint"]},
                            "table": {"id": 0, "type": "table"},
                            "tableSize": 800000.0,
                            "tablename": "partsupp",
                            "tableoid": {"type": "tableoid"},
                            "tid": {"iu": "tid", "type": ["type", "bigint"]}
                        },
                        "type": "inner"
                    },
                    "key": [{
                        "arg": 0,
                        "iu": {
                            "expression": "iuref",
                            "iu": "partsupp1@ps_partkey",
                            "type": {"numBits": 32, "signed": True, "type": "numeric"}
                        }
                    }],
                    "operator": "groupby",
                    "operatorId": 17,
                    "order": [],
                    "physicalOperator": "groupby",
                    "values": [{"expression": "iuref", "iu": "partsupp1@ps_partkey"}, {
                        "expression": "iuref",
                        "iu": "partsupp1@ps_supplycost"
                    }]
                },
                "type": "single"
            },
            "limit": 100,
            "operator": "sort",
            "operatorId": 2,
            "order": [{"collate": "", "value": {"expression": "iuref", "iu": "supplier@s_acctbal"}}, {
                "collate": "",
                "value": {"expression": "iuref", "iu": "nation@n_name"}
            }, {"collate": "", "value": {"expression": "iuref", "iu": "supplier@s_name"}}, {
                          "collate": "",
                          "value": {"expression": "iuref", "iu": "part@p_partkey"}
                      }],
            "physicalOperator": "sort"
        }, "query": True, "type": 0
    }
}

raw_data = """
|                  l_returnflag  |                  l_linestatus  |                       sum_qty  |                sum_base_price  |                sum_disc_price  |                    sum_charge  |                       avg_qty  |                     avg_price  |                      avg_disc  |                   count_order  |
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                             A  |                             F  |                    3774200.00  |                 5320753880.69  |               5054096266.6828  |             5256751331.449234  |      25.537587116854996955139  |   36002.123829014141687529602  |       0.050144597063400771364  |                        147790  |
|                             N  |                             F  |                      95257.00  |                  133737795.84  |                127132372.6512  |              132286291.229445  |      25.300664010624169986719  |   35521.326916334661354581673  |       0.049394422310756972111  |                          3765  |
|                             N  |                             O  |                    7459297.00  |                10512270008.90  |               9986238338.3847  |            10385578376.585467  |      25.545537671232876712328  |   36000.924688013698630136986  |       0.050095958904109589041  |                        292000  |
|                             R  |                             F  |                    3785523.00  |                 5337950526.47  |               5071818532.9420  |             5274405503.049367  |      25.525943857425101651371  |   35994.029214030923594581290  |       0.049989278561843817641  |                        148301  |
"""


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


def get_analyzed_query_plan(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise RuntimeError("Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        # Define the chained command as a string
        command = "/home/michael/projects/code/build/lingodb-release/sql-to-mlir " + query_file + " /home/michael/projects/code/resources/data/" + db + "/metadata.json |  /home/michael/projects/code/build/lingodb-release/mlir-db-opt --use-db /home/michael/projects/code/resources/data/" + db + " --relalg-query-opt --relalg-track-tuples"
        print(command)
        # Create a temporary file to store the output
        with tempfile.NamedTemporaryFile(mode='w', delete=True) as tmpfile:
            # Call the chained command using subprocess.run()
            result = subprocess.run(command, shell=True, stdout=tmpfile, text=True)

            # Check that the command exited successfully
            if result.returncode == 0:
                try:
                    # Build command string
                    cmd = ["/home/michael/projects/code/build/lingodb-release/mlir-to-json", tmpfile.name,
                           "/home/michael/projects/code/resources/data/" + db]

                    # Execute command and capture output
                    output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT)
                    return json.loads(output.split("\n")[0]);

                except subprocess.CalledProcessError as e:
                    # Print error message to stderr
                    print(e.output, file=sys.stderr)
                    raise RuntimeError("Query could not be executed")
            else:
                # Print the error message
                print(result.stderr.strip())


def get_query_plan(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise RuntimeError("Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        # Define the chained command as a string
        command = "/home/michael/projects/code/build/lingodb-release/sql-to-mlir " + query_file + " /home/michael/projects/code/resources/data/" + db + "/metadata.json |  /home/michael/projects/code/build/lingodb-release/mlir-db-opt --use-db /home/michael/projects/code/resources/data/" + db + " --relalg-query-opt"
        print(command)
        # Create a temporary file to store the output
        with tempfile.NamedTemporaryFile(mode='w', delete=True) as tmpfile:
            # Call the chained command using subprocess.run()
            result = subprocess.run(command, shell=True, stdout=tmpfile, text=True)

            # Check that the command exited successfully
            if result.returncode == 0:
                try:
                    # Build command string
                    cmd = ["/home/michael/projects/code/build/lingodb-release/mlir-to-json", tmpfile.name]

                    # Execute command and capture output
                    output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT)
                    return json.loads(output.split("\n")[0]);

                except subprocess.CalledProcessError as e:
                    # Print error message to stderr
                    print(e.output, file=sys.stderr)
                    raise RuntimeError("Query could not be executed")
            else:
                # Print the error message
                print(result.stderr.strip())


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
        cmd = ["/home/michael/projects/code/build/lingodb-release/run-sql", query_file,
               "/home/michael/projects/code/resources/data/" + db]

        # Execute command and capture output
        output = subprocess.check_output(cmd, universal_newlines=True, stderr=subprocess.STDOUT)
        # Parse output and skip first and last 4 lines
        splitted = output.split("\n")
        header_list = splitted[-2].split()
        times_list = splitted[-1].split()
        times_dict = {}

        for i in range(len(header_list)):
            if header_list[i] != 'name':
                times_dict[header_list[i]] = float(times_list[i])
        result = "\n".join(splitted[1:-4])
        table_as_json = table_to_json(raw_table=result)
        return {"result": table_as_json, "timing": times_dict}

    except subprocess.CalledProcessError as e:
        # Print error message to stderr
        print(e.output, file=sys.stderr)
        raise HTTPException(status_code=400, detail="Query could not be executed")


    finally:
        # Delete temporary file
        if query_file:
            os.remove(query_file)


def sql_to_mlir(query_str, db):
    if db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(query_str)
        query_file = f.name
        f.flush()
        try:
            # Build command string
            cmd = ["/home/michael/projects/code/build/lingodb-release/sql-to-mlir", query_file,
                   "/home/michael/projects/code/resources/data/" + db + "/metadata.json"]
            # Execute command and capture output
            output = subprocess.check_output(cmd, universal_newlines=True)
            print(cmd)
            print(output)
            return output

        except subprocess.CalledProcessError as e:
            # Print error message to stderr
            print(e.output, file=sys.stderr)
            raise HTTPException(status_code=400, detail="Failed to generate MLIR")


def mlir_opt(mlir_str, db, opts):
    if db and db not in ["tpch-1", "tpcds-1", "uni", "job"]:
        raise HTTPException(status_code=403, detail="Unknown Database")
    # Write query to temporary file
    with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
        f.write(mlir_str)
        mlir_file = f.name
        f.flush()
        try:
            # Build command string
            cmd = ["/home/michael/projects/code/build/lingodb-release/mlir-db-opt"]
            if db:
                cmd.append("--use-db")
                cmd.append("/home/michael/projects/code/resources/data/" + db)
            cmd.extend(opts)
            cmd.append(mlir_file)
            # Execute command and capture output
            output = subprocess.check_output(cmd, universal_newlines=True)
            print(cmd)
            print(output)
            return output

        except subprocess.CalledProcessError as e:
            # Print error message to stderr
            print(e.output, file=sys.stderr)
            raise HTTPException(status_code=400, detail="Failed to generate MLIR")


# Define a route that accepts database and query parameters and returns the sample data as JSON on a GET request
@app.get("/query_plan")
async def query_plan(database: str, query: str):
    # Here you can use the database and query parameters to execute your query against your database
    # and return the results as a JSON response.
    # For the sake of this example, we will just return the sample data as JSON.
    return get_query_plan(query, database)


@app.get("/execute")
async def execute(database: str, query: str):
    return run_sql_query(query, database)


@app.get("/mlir_steps")
async def mlir_steps(database: str, query: str):
    canonical = sql_to_mlir(query, database)
    qopt = mlir_opt(canonical,database,["--relalg-query-opt"])
    subop = mlir_opt(qopt,None,["--lower-relalg-to-subop"])
    imperative = mlir_opt(subop,None,["--lower-subop"])
    lowlevel = mlir_opt(imperative,None,["--lower-db","--lower-dsa"])

    return {
        "canonical": canonical,
        "qopt": qopt,
        "subop": subop,
        "imperative": imperative,
        "lowlevel":lowlevel,
        "llvm":""
    }
