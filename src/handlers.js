const Fetcher = require('./fetcher');

const app = require('jovo-framework').Jovo;
const htmlToText = require('html-to-text');

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

const searchDurationRoute = (hours, minutes) => {
    const result = [];
    let duration=0;
    if(hours){
        duration=duration+Number(hours);
    }
    if(minutes){
        duration=duration+Number((minutes/60)*100);
    }
    Object.values(annotations).forEach(function (ann){
        const value = getFeature(ann, 'time_total');
        if (value) {
            if (value.toString()===duration.toString()){
                result.push(ann);
            }
        }
    })
    return result;
};

const handlersEN = {
    LAUNCH() {
        app.toIntent('WelcomeIntent');
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
        console.log(ann.name)
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
        END() {
            app.tell('bye');
        },
};

const handlersDE = {
    LAUNCH() {
        app.toIntent('WelcomeIntent');
    },
    WelcomeIntent() {
        console.log();
        app.tell('Willkommen zu Wandern in Tirol');
    },
    HelpIntent() {
        console.log();
        app.tell('Willkommen zu Wandern in Tirol, wenn du eine zufällige wanderroute haben willst, frag: gib mir eine zufällige wanderroute');
    },
    NeartoIntent() {
        //TODO
    },
    DifficultySearchIntent(duration) {
        duration=duration.replace("PT","");
        let hours=duration.split("H",1)
        duration=duration.substring(duration.indexOf("H") + 1);
        let minutes=duration.split("M",1)
        let result= searchDurationRoute(hours,minutes);
        if(result.length===0){
            app.ask('Es wurde leider keine Wanderung gefunden, die ' + hours+"Stunden und "+minutes+"Minuten geht. Bitte wähle eine andere Zeit")
        }else{
            app.setSessionAttribute('annId', result[0].identifier);
            app.followUpState('SelectedHiking');
            app.ask('Es wurden '+result.length+' Wanderungen gefunden. Eine davon ist:'+result[0].name+". Du kannst jetzt nach mehr Informationen zu dieser Wanderroute fragen.")
        }

    },
    HelloWorldIntent() {
        app.tell('Hello World Intent!');
    },
    RandomHikingIntent() {
        const ann = Object.values(seefeldData.annotations)[randNumber(Object.keys(seefeldData.annotations).length)];
        app.setSessionAttribute('annId', ann.identifier);
        app.followUpState('SelectedHiking');
        app.ask(`Deine zufällige Wanderroute ist: ${ann.name}. Du kannst jetzt nach Informationen zu dieser route, oder nach etwas anderem fragen. Was möchtest du wissen?`)
    },
    SelectedHiking: {
        ContactIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'contactPoint') && hasProp(ann.contactPoint, 'telephone')) {
                /** @namespace ann.contactPoint.telephone */
                app.ask(`Die Telefonnummer ist ${ann.contactPoint.telephone}. Was möchtest du  noch wissen?`);
            } else {
                app.ask('Diese Wanderroute hat leider keine Telefonnummer! Was möchtest du  noch wissen?');
            }
        },
        DifficultyIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const difficultyValue = getFeature(ann, 'difficulty');
            if (difficultyValue) {
                app.ask(`Die Wanderroute hat den Schwierigkeitsgrad ${difficultyValue}. Was möchtest du  noch wissen?`);
            } else {
                app.ask('Die Wanderroute hat leider keinen Schwierigkeitsgrad! Was möchtest du  noch wissen?');
            }
        },
        ImageIntent() {
            // send card with image
            const ann = annotations[app.getSessionAttribute('annId')];
            if(hasProp(ann, 'image')){
                let title = ann.name;
                let content = "Ein Bild zu dieser Wanderroute";
                let imageUrl;
                if(ann.image.length===undefined){
                    imageUrl=ann.image.contentUrl
                }else{
                    imageUrl=ann.image[0].contentUrl
                }
                app.showImageCard(title,content,imageUrl).ask('Ich habe ein Bild an deine Alexa App geschickt. Was möchtest du noch wissen?');
            }else{
                app.ask('Leider habe ich für diese Wanderroute kein Bild. Was möchtest du noch wissen?')
            }

        },
        SendInformationIntent() {
            // send card with data
            const ann = annotations[app.getSessionAttribute('annId')];
            let title = ann.name;
            let content="";
            const difficultyValue = getFeature(ann, 'difficulty');
            if (difficultyValue) {
                content=content+'Schwierigkeit: '+difficultyValue+'\n\n';
            }
            if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                content=content+'Länge: '+ann.potentialAction.distance.replace('.', ',')+'\n\n';
            }
            const value = getFeature(ann, 'time_total').toString();
            if (value) {
                content=content+'Zeit: '+value+'h\n\n';
            }
            if(hasProp(ann,'description')){
                content=content+'Beschreibung:\n'+htmlToText.fromString(ann.description)+'\n\n';
            }

            console.log(content)
            if(hasProp(ann, 'image')){
                let imageUrl;
                if(ann.image.length===undefined){
                    imageUrl=ann.image.contentUrl
                }else{
                    imageUrl=ann.image[0].contentUrl
                }
                app.showImageCard(title,content,imageUrl).ask('Ich habe die Informationen an deine Alexa app geschickt. Was möchtest du noch wissen?');
            }else{
                app.showSimpleCard(title, content).ask('Ich habe die Informationen an deine Alexa app geschickt. Was möchtest du noch wissen?');
            }

        },
        LengthIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                /** @namespace ann.potentialAction.distance */
                app.ask(`Die Wanderroute ist ${ann.potentialAction.distance.replace('.', ',')} lang.  Was möchtest du  noch wissen?`);
            } else {
                app.ask('Die Wanderroute hat leider keine Längenangaben! Was möchtest du  noch wissen?');
            }
        },
        TimeIntent() {
            const ann = annotations[app.getSessionAttribute('annId')];
            const value = getFeature(ann, 'time_total').toString();
            if (value) {
                app.ask(`Die Wanderroute dauert ${value.replace('.', ',')} Stunden.  Was möchtest du  noch wissen?`);
            } else {
                app.ask('Die Wanderroute hat leider keine Zeitangabe  Was möchtest du  noch wissen?');
            }
        },
        MapIntent() {
            //TODO ? not possible to shown the map, and no clickable links
            const ann = annotations[app.getSessionAttribute('annId')];
            if (hasProp(ann, 'hasMap')){
                let title = ann.name;
                app.showSimpleCard(title,ann.hasMap).ask('Ich habe die Informationen an deine Alexa app geschickt. Was möchtest du noch wissen?');
            } else {
                app.ask('Die Wanderroute hat leider keine Karte.  Was möchtest du  noch wissen?');
            }
        },
    },
    Unhandled() {
        let speech = 'Du musst erst eine Wanderung auswählen.';
        let reprompt = 'Was möchtest du tun?';
        app.ask(speech, reprompt);
    },

    END() {
        app.tell('Auf wiedersehen!');
    },

};

module.exports = {
    handlersEN,
    handlersDE,
};
