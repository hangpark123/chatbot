const express = require("express");
const app = express();
const { WebhookClient } = require("dialogflow-fulfillment");
const port = 8120;
app.use(express.json());

app.post("/", express.json(), (req, res) => {
    const request = req.body;
    const response = {
        fulfillmentText: "test"
    };

    res.send(response);
});

app.listen(port, () => {
});