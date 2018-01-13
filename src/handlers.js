const Fetcher = require('./fetcher');

const app = require('jovo-framework').Jovo;

let annotations;
const seefeldData = new Fetcher('seefeld', 'de', () => {
    const mayrhofenData = new Fetcher('mayrhofen_gdi', 'de', () => {
        annotations = Object.assign(seefeldData.annotations, mayrhofenData.annotations);
    });
});

const randNumber = max => Math.floor(Math.random() * max);
const has = Object.prototype.hasOwnProperty;
const hasProp = (o, p) => has.call(o, p) && o[p];

const getFeature = (obj, featureId) => {
    const ann = obj;
    if (hasProp(ann, 'amenityFeature')) {
        /** @namespace ann.amenityFeature */
        let features = ann.amenityFeature;
        if (!Array.isArray(ann.amenityFeature)) {
            features = [ann.amenityFeature];
        }
        let value;
        features.forEach((feature) => {
            if (hasProp(feature, 'identifier') && feature.identifier === featureId) {
                ({ value } = feature);
            }
        });
        return value;
    }
    return null;
};


const handlersEN = {
    LAUNCH() {
        app.toIntent('Launch');
    },
    WelcomeIntent() {
        console.log();
        app.tell('Welcome to Hiking in tyrol');
    },
    HelloWorldIntent() {
        app.tell('Hello World Intent!');
    },
    RandomHikingIntent() {
        const ann = Object.values(annotations)[randNumber(Object.keys(annotations).length)];
        app.setSessionAttribute('annId', ann.id);
        app.followUpState('SelectedHiking');
        app.ask(`Your random hiking route is: ${ann.name}`);
    },
    SelectedHiking: {
        ContactIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'contactPoint') && hasProp(ann.contactPoint, 'telephone')) {
                /** @namespace ann.contactPoint.telephone */
                app.ask(`The telephone number is ${ann.contactPoint.telephone}`);
            } else {
                app.ask('The hiking trail doesn\'t have a telephone number');
            }
        },
        DifficultyIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const difficultyValue = getFeature(ann, 'difficulty');
            if (difficultyValue) {
                app.ask(`The hiking trail has the difficulty ${difficultyValue}`);
            } else {
                app.ask('The hiking trail doesn\'t have a specified difficulty');
            }
        },
        ImageIntent() {
            // send an image
            app.tell('ImageIntent!');
        },
        LengthIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                /** @namespace ann.potentialAction.distance */
                app.ask(`The hiking trail is ${ann.potentialAction.distance} long`);
            } else {
                app.ask('The hiking trail doesn\'t have a specified length');
            }
        },
        TimeIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const value = getFeature(ann, 'time_total');
            if (value) {
                app.ask(`The hiking trail takes ${value} hours`);
            } else {
                app.ask('The hiking trail doesn\'t have a specified duration');
            }
        },
    },
};

const handlersDE = {
    LAUNCH() {
        app.toIntent('Launch');
    },
    WelcomeIntent() {
        console.log();
        app.tell('Wilkommen zu Wandern in Tirol');
    },
    HelpIntent() {
        console.log();
        app.tell('Wilkommen zu Wandern in Tirol, wenn du eine zufällige wanderroute haben willst, frag: gib mir eine zufällige wanderroute');
    },
    HelloWorldIntent() {
        app.tell('Hello World Intent!');
    },
    RandomHikingIntent() {
        const ann = Object.values(seefeldData.annotations)[randNumber(Object.keys(seefeldData.annotations).length)];
        app.setSessionAttribute('annId', ann.identifier);
        app.followUpState('SelectedHiking');
        app.ask(`Deine zufällige Wanderroute ist: ${ann.name}`);
    },
    SelectedHiking: {
        ContactIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'contactPoint') && hasProp(ann.contactPoint, 'telephone')) {
                /** @namespace ann.contactPoint.telephone */
                app.ask(`Die Telefonnummer ist ${ann.contactPoint.telephone}`);
            } else {
                app.ask('Diese Wanderroute hat leider keine Telefonnummer!');
            }
        },
        DifficultyIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const difficultyValue = getFeature(ann, 'difficulty');
            if (difficultyValue) {
                app.ask(`Die Wanderroute hat den Schwierigkeitsgrad ${difficultyValue}`);
            } else {
                app.ask('Die Wanderroute hat leider keinen Schwierigkeitsgrad!');
            }
        },
        ImageIntent() {
            // send an image
            app.tell('ImageIntent!');
        },
        LengthIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                /** @namespace ann.potentialAction.distance */
                app.ask(`Die Wanderroute ist ${ann.potentialAction.distance.replace('.', ',')} lang`);
            } else {
                app.ask('Die Wanderroute hat leider keine Längenangaben!');
            }
        },
        TimeIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const value = getFeature(ann, 'time_total').toString();
            if (value) {
                app.ask(`Die Wanderroute dauert ${value.replace('.', ',')} Stunden`);
            } else {
                app.ask('Die Wanderroute hat leider keine Zeitangabe');
            }
        },
    },
};

module.exports = {
    handlersEN,
    handlersDE,
};
