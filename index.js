'use strict';

// =================================================================================
// App Configuration
// =================================================================================
//https://1a087932.ngrok.io/webhook
const app = require('jovo-framework').Jovo;
const webhook = require('jovo-framework').Webhook;
const Fetcher = require("./getData");

// Listen for post requests
webhook.listen(8008, function() {
    console.log('Local development server listening on port 8008...');
});

webhook.post('/webhook', function(req, res) {
    app.handleRequest(req, res, handlers);
    app.execute();
});


// =================================================================================
// App Logic
// =================================================================================


const seefeldData = new Fetcher("seefeld");
const mayrhofenData = new Fetcher("mayrhofen_gdi");

const randNumber = max => Math.floor(Math.random() * max);

const handlers = {

    'LAUNCH': function() {
        app.toIntent('Launch');
    },

    'WelcomeIntent': function() {
        app.tell('Welcome');
    },

    'RandomHikingIntent': function() {
        const randName = seefeldData.annotations[randNumber(seefeldData.annotations.length)]["name"];
        app.tell('Your random hiking route is: ' + randName);
    },

    'HelloWorldIntent': function() {
        app.tell('Hello World Intent!');
    },
};
