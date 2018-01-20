const app = require('jovo-framework').Jovo;
const htmlToText = require('html-to-text');
const Fuse = require('fuse.js');
const webshot = require('webshot');
const googleMaps = require('@google/maps');
const geolib = require('geolib');

const strings = require('../models/localizedStrings');
const keys = require('../misc/keys');

const Fetcher = require('./fetcher');

const ngrok = 'http://c2b588bf.ngrok.io/image/?image='; //TODO Update server url
const readResults=5;

const googleMapsClient = googleMaps.createClient({
    key: keys.googleApiKey,
});

const annotations = {};
const seefeldDataDE = new Fetcher('seefeld', 'de', () => {
    const mayrhofenDataDE = new Fetcher('mayrhofen_gdi', 'de', () => {
        annotations.de = Object.assign(seefeldDataDE.annotations, mayrhofenDataDE.annotations);
    });
});

const seefeldDataEN = new Fetcher('seefeld', 'en', () => {
    const mayrhofenDataEN = new Fetcher('mayrhofen_gdi', 'en', () => {
        annotations.en = Object.assign(seefeldDataEN.annotations, mayrhofenDataEN.annotations);
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

const searchDurationRoute = (durationtime, lang, equal) => {
    console.log(equal);
    const result = [];
    let duration = 0;
    let dur = durationtime;
    dur = dur.replace('PT', '');
    const hours = dur.split('H', 1);
    dur = dur.substring(dur.indexOf('H') + 1);
    const minutes = dur.split('M', 1);
    if (hours) {
        duration += Number(hours);
    }
    if (minutes) {
        duration += Number((minutes / 60) * 100);
    }
    Object.values(annotations[lang]).forEach((ann) => {
        const value = getFeature(ann, 'time_total');
        if (value) {
            switch(equal){
                case "equal":
                    if ( parseFloat(value) === parseFloat(duration)) {
                        result.push(ann);
                    }
                    break;
                case "smaller":
                    if ( parseFloat(value) < parseFloat(duration)) {
                        result.push(ann);
                    }
                    break;
                case "bigger":
                    if ( parseFloat(value) > parseFloat(duration)) {
                        result.push(ann);
                    }
                    break;
            }

        }
    });
    switch(equal){
        case "equal":
            break;
        case "bigger":
            result.sort(function (a, b) {
                return getFeature(a, 'time_total') - getFeature(b, 'time_total');
            });
            break;
        case "smaller":
            result.sort(function (a, b) {
                return getFeature(b, 'time_total') - getFeature(a, 'time_total');
            });
            break;
    }
    result.forEach(function (a){
        console.log(getFeature(a, 'time_total').toString());
    });
    return result;
};


const fuseSearch = (nameInput, lang) => {
    let result = null;
    const input = Object.values(annotations[lang]);
    const options = {
        shouldSort: true,
        keys: ['name'],
        id: 'identifier',
    };
    const fuse = new Fuse(input, options);
    const temp = fuse.search(nameInput);
    if (temp === undefined) {
        return null;
    }
    if (temp.length > 1) {
        return temp[0];
    }
    result = temp;
    return result;
};

const maxDist = 100000000;
const searchNearest = (lat, lng, lang) => {
    let minDist = maxDist;
    let minPlace;
    Object.values(annotations[lang]).forEach((v) => {
        let geos = v.geo;
        if (!Array.isArray(v.geo)) {
            geos = [v.geo];
        }
        geos.forEach((singleGeo) => {
            const coordinates = singleGeo.line.split(' ');
            console.log(coordinates[0], coordinates[1], coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]);
            const distStartPoint = geolib.getDistance(
                { latitude: coordinates[0], longitude: coordinates[1] },
                { latitude: lat, longitude: lng },
            );
            const distEndPoint = geolib.getDistance(
                { latitude: coordinates[coordinates.length - 2], longitude: coordinates[coordinates.length - 1] },
                { latitude: lat, longitude: lng },
            );
            console.log(distStartPoint, distEndPoint);
            if (distEndPoint < minDist) {
                minDist = distEndPoint;
                minPlace = v;
            }
            if (distStartPoint < minDist) {
                minDist = distStartPoint;
                minPlace = v;
            }
        });
    });
    return { minPlace, minDist };
};

class Handler {
    constructor(lang) {
        this.lang = lang;
        this.handler = {
            LAUNCH() {
                app.toIntent('WelcomeIntent');
            },
            HelloWorldIntent() {
                app.tell('Hello World Intent!');
            },
            WelcomeIntent() {
                console.log();
                app.tell(strings.welcome_message[lang]);
            },
            HelpIntent() {
                console.log();
                app.tell(strings.help.de);
            },
            NeartoIntent(name) {
                console.log(name);
                if (name === undefined) {
                    app.tell(strings.no_city_name[lang]);
                } else {
                    googleMapsClient.geocode({
                        address: name,
                        region: 'tirol',
                    }, (err, response) => {
                        if (!err) {
                            const places = response.json.results;
                            if (places.length === 0) {
                                app.tell(strings.no_city_name[lang]);
                                console.log('no city');
                                return;
                            }
                            if (places.length < 0) {
                                console.log('more places');
                                console.log(JSON.stringify(response.json.results, null, 2));
                            }
                            const place = places[0];
                            if (!place.geometry.location) {
                                console.log('no coors');
                                return;
                            }
                            const { lat, lng } = place.geometry.location;
                            console.log(lat, lng);
                            const { minPlace, minDist } = searchNearest(lat, lng, lang);
                            if (!minPlace || minDist === maxDist) {
                                app.tell(strings.error[lang]);
                                return;
                            }
                            const dist = (lang === 'de' ? (minDist / 1000).toString().replace('.', ',') : (minDist / 1000).toString());
                            console.log(dist);
                            app.setSessionAttribute('annId', minPlace.identifier);
                            app.followUpState('SelectedHiking');
                            app.ask(strings.nearest_trail[lang].replace('$distance', dist).replace('$name', minPlace.name));
                        } else {
                            console.log(err, response);
                            app.tell(strings.error[lang]);
                        }
                    });
                }
            },
            DurationSearchIntentBigger(duration) {
                const result = searchDurationRoute(duration, lang,"bigger");
                if (result.length === 0) {
                    app.ask(strings.dif_search_dur_not_found[lang].replace('$hours', hours).replace('$minutes', minutes));
                } else {
                    if(result.length === 1){
                        app.setSessionAttribute('annId', result[0].identifier);
                        app.followUpState('SelectedHiking');
                        app.ask(strings.dif_search_res[lang].replace('$length', result.length).replace('$name', result[0].name));
                    }else{
                        let ids=[];
                        result.forEach(function (r){
                            ids.push(r.identifier);
                        });
                        app.setSessionAttribute('manyRoutes', ids);
                        app.followUpState('ManyResults');
                        let text='';
                        let i=1;
                        ids.forEach(function (r){
                            if(i<readResults){
                                text=text+i.toString()+". :"+annotations[lang][r].name+ ", ";
                                i++;
                            }
                        });
                        app.ask(strings["many_routes"][lang].replace('$names', text));
                    }

                }
            },
            DurationSearchIntentEqual(duration) {
                const result = searchDurationRoute(duration, lang,"equal");
                if (result.length === 0) {
                    app.ask(strings.dif_search_dur_not_found[lang].replace('$hours', hours).replace('$minutes', minutes));
                } else {
                    if(result.length === 1){
                        app.setSessionAttribute('annId', result[0].identifier);
                        app.followUpState('SelectedHiking');
                        app.ask(strings.dif_search_res[lang].replace('$length', result.length).replace('$name', result[0].name));
                    }else{
                        let ids=[];
                        result.forEach(function (r){
                            ids.push(r.identifier);
                        });
                        app.setSessionAttribute('manyRoutes', ids);
                        app.followUpState('ManyResults');
                        let text='';
                        let i=1;
                        ids.forEach(function (r){
                            if(i<readResults){
                                text=text+i.toString()+". :"+annotations[lang][r].name+ ", ";
                                i++;
                            }
                        });
                        app.ask(strings["many_routes"][lang].replace('$names', text));
                    }

                }
            },
            DurationSearchIntentSmaller(duration) {
                const result = searchDurationRoute(duration, lang,"smaller");
                if (result.length === 0) {
                    app.ask(strings.dif_search_dur_not_found[lang].replace('$duration', duration));
                } else {
                    if(result.length === 1){
                        app.setSessionAttribute('annId', result[0].identifier);
                        app.followUpState('SelectedHiking');
                        app.ask(strings.dif_search_res[lang].replace('$length', result.length).replace('$name', result[0].name));
                    }else{
                        let ids=[];
                        result.forEach(function (r){
                            ids.push(r.identifier);
                        });
                        app.setSessionAttribute('manyRoutes', ids);
                        app.followUpState('ManyResults');
                        let text='';
                        let i=1;
                        ids.forEach(function (r){
                            if(i<readResults){
                                text=text+i.toString()+". :"+annotations[lang][r].name+ ", ";
                                i++;
                            }
                        });
                        app.ask(strings["many_routes"][lang].replace('$names', text));
                    }

                }
            },

            RandomHikingIntent() {
                const ann = Object.values(annotations[lang])[randNumber(Object.keys(annotations[lang]).length)];
                app.setSessionAttribute('annId', ann.identifier);
                app.followUpState('SelectedHiking');
                app.ask(strings.rand_hiking[lang].replace('$name', ann.name));
            },
            SearchNameIntent(nameRoute) {
                if (nameRoute === undefined) {
                    app.ask(strings.no_name[lang]);
                } else {
                    const result = fuseSearch(nameRoute, lang);
                    if (result) {
                        const ann = annotations[lang][result];
                        app.setSessionAttribute('annId', ann.identifier);
                        app.followUpState('SelectedHiking');
                        app.ask(strings.found_name[lang].replace('$routename', ann.name));
                    } else {
                        app.ask(strings.no_name[lang]);
                    }
                }
            },
            ManyResults: {
                NumberIntent(number){
                    app.setSessionAttribute('annId', app.getSessionAttribute('manyRoutes')[number-1]);
                    app.followUpState('SelectedHiking');
                    app.ask(strings.selected_hiking[lang].replace('$name', annotations[lang][app.getSessionAttribute('manyRoutes')[number-1]].name));
                }
            },
            SelectedHiking: {
                ContactIntent() {
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    if (hasProp(ann, 'contactPoint') && hasProp(ann.contactPoint, 'telephone')) {
                        /** @namespace ann.contactPoint.telephone */
                        app.ask(strings.tel_num[lang].replace('$telephone', ann.contactPoint.telephone));
                    } else {
                        app.ask(strings.no_tel_num[lang]);
                    }
                },
                DifficultyIntent() {
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    const difficultyValue = getFeature(ann, 'difficulty');
                    if (difficultyValue) {
                        app.ask(strings.dif[lang].replace('$difficulty', difficultyValue));
                    } else {
                        app.ask(strings.no_dif[lang]);
                    }
                },
                ImageIntent() {
                    // send card with image
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    if (hasProp(ann, 'image')) {
                        const title = ann.name;
                        const content = strings.image_to_route[lang];
                        let imageUrl;
                        if (ann.image.length === undefined) {
                            imageUrl = ann.image.contentUrl;
                        } else {
                            imageUrl = ann.image[0].contentUrl;
                        }
                        app.showImageCard(title, content, imageUrl).ask(strings.send_image_to_route[lang]);
                    } else {
                        app.ask(strings.no_image_to_route[lang]);
                    }
                },
                SendInformationIntent() {
                    // send card with data
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    const title = ann.name;
                    let content = '';
                    const difficultyValue = getFeature(ann, 'difficulty');
                    if (difficultyValue) {
                        content = `${content}${strings.dif_word[lang]}: ${difficultyValue}\n\n`;
                    }
                    if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                        content = `${content}${strings.length_word[lang]}: ${ann.potentialAction.distance.replace('.', ',')}\n\n`;
                    }
                    const value = getFeature(ann, 'time_total').toString();
                    if (value) {
                        content = `${content}${strings.time_word[lang]}: ${value}h\n\n`;
                    }
                    if (hasProp(ann, 'description')) {
                        content = `${content}${strings.description_word[lang]}: \n${htmlToText.fromString(ann.description)}\n\n`;
                    }

                    console.log(content);
                    if (hasProp(ann, 'image')) {
                        let imageUrl;
                        if (ann.image.length === undefined) {
                            imageUrl = ann.image.contentUrl;
                        } else {
                            imageUrl = ann.image[0].contentUrl;
                        }
                        app.showImageCard(title, content, imageUrl);
                    } else {
                        app.showSimpleCard(title, content);
                    }
                    app.ask(strings.send_img_card[lang]);
                },
                LengthIntent() {
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    if (hasProp(ann, 'potentialAction') && hasProp(ann.potentialAction, 'distance')) {
                        /** @namespace ann.potentialAction.distance */
                        let { distance } = ann.potentialAction;
                        if (lang === 'de') {
                            distance = distance.replace('.', ',');
                        }
                        app.ask(strings.length[lang].replace('$distance', distance));
                    } else {
                        app.ask(strings.no_length[lang]);
                    }
                },
                TimeIntent() {
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    const value = getFeature(ann, 'time_total').toString();
                    if (value) {
                        app.ask(strings.time[lang].replace('$time', value.replace('.', ',')));
                    } else {
                        app.ask(strings.no_time[lang]);
                    }
                },
                MapIntent() {
                    // TODO ? not possible to shown the map, and no clickable links
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    if (hasProp(ann, 'hasMap')) {
                        const title = ann.name;
                        webshot(ann.hasMap, `../images/${title}.jpg`, (err) => {
                            if (err) {
                                app.ask(strings.no_map[lang]);
                            } else {
                                app.showImageCard(title, ann.hasMap, `${ngrok + title}.jpg`).ask(strings.map[lang]);
                            }
                        });
                    } else {
                        app.ask(strings.no_map[lang]);
                    }
                },
            },
            Unhandled() {
                const speech = strings.unhandled_1[lang];
                const reprompt = strings.unhandled_2[lang];
                app.ask(speech, reprompt);
            },

            END() {
                app.tell(strings.bye[lang]);
            },

        };
    }
}

module.exports = Handler;
