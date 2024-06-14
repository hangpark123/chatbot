const functions = require('firebase-functions');

exports.dialogflowFulfillment = functions.https.onRequest((request, response) => {
    const intentName = request.body.queryResult.intent.displayName;
    const fulfillmentText = `You have reached the fulfillment for ${intentName}.`;

    response.json({ fulfillmentText });
});
