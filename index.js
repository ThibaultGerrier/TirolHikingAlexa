// =================================================================================
// App Configuration
// =================================================================================
// https://1a087932.ngrok.io/webhook
const app = require('jovo-framework').Jovo;
const webhook = require('jovo-framework').Webhook;
const Handler = require('./src/handlers');

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
