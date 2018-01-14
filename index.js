// =================================================================================
// App Configuration
// =================================================================================
// https://1a087932.ngrok.io/webhook
const app = require('jovo-framework').Jovo;
const webhook = require('jovo-framework').Webhook;
const Handler = require('./src/handlers');
const fs = require('fs');
const path = require('path');


// Listen for post requests
webhook.listen(8008, () => {
    console.log('Local development server listening on port 8008...');
});

const handlerDE = new Handler('de');
const handlerEN = new Handler('en');

webhook.post('/webhook', (req, res) => {
    switch (req.body.request.locale) {
    case 'de-DE':
        app.handleRequest(req, res, handlerDE.handler);
        break;
    case 'en-US':
        app.handleRequest(req, res, handlerEN.handler);
        break;
    default:
        console.log('Unknown language', req.body.request.locale);
    }
    app.execute();
});

webhook.get('/image/', (req, res) => {
    fs.readFile(`../images/${req.query.image}`, (err, content) => {
        if (err) {
            res.writeHead(400, { 'Content-type': 'text/html' });
            console.log(err);
            res.end('No such image');
        } else {
            // specify the content type in the response will be an image
            res.writeHead(200, { 'Content-type': 'image/jpg' });
            res.end(content);
        }
    });
});
