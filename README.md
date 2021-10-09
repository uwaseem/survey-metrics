# survey-metrics

## Introduction
This endpoint will pull SMS logs from Infobip and also Survey metrics from Delighted. It will calculate and return the response rate based on the logs and metrics.

### How To Use
GET /metrics/:country?password

The results are split by country so make sure you pass the correct country value. Currently supported are id, my and th.

You would also need to pass in the password as part of the query string.
