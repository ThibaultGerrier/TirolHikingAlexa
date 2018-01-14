const Fetcher = require('./fetcher');

const app = require('jovo-framework').Jovo;
const htmlToText = require('html-to-text');

const strings = require('../models/localizedStrings');

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

class Handler {
    searchDurationRoute(hours, minutes){
        const result = [];
        let duration = 0;
        if (hours) {
            duration += Number(hours);
        }
        if (minutes) {
            duration += Number((minutes / 60) * 100);
        }
        Object.values(annotations[this.lang]).forEach((ann) => {
            const value = getFeature(ann, 'time_total');
            if (value) {
                if (value.toString() === duration.toString()) {
                    result.push(ann);
                }
            }
        });
        return result;
    }

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
            NeartoIntent() {
                // TODO
            },
            DifficultySearchIntent(duration) {
                let dur = duration;
                dur = dur.replace('PT', '');
                const hours = dur.split('H', 1);
                dur = dur.substring(dur.indexOf('H') + 1);
                const minutes = dur.split('M', 1);
                const result = this.searchDurationRoute(hours, minutes);
                if (result.length === 0) {
                    app.ask(strings.dif_search_dur_not_found[lang].replace('$hours', hours).replace('$minutes', minutes));
                } else {
                    app.setSessionAttribute('annId', result[0].identifier);
                    app.followUpState('SelectedHiking');
                    app.ask(strings.dif_search_res[lang].replace('$length', result.length).replace('$name', result[0].name));
                }
            },
            RandomHikingIntent() {
                const ann = Object.values(annotations[lang])[randNumber(Object.keys(annotations[lang]).length)];
                app.setSessionAttribute('annId', ann.identifier);
                app.followUpState('SelectedHiking');
                app.ask(strings.rand_hiking[lang].replace('$name', ann.name));
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
                        content = `${content}${strings.description_word_word[lang]}: \n${htmlToText.fromString(ann.description)}\n\n`;
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
                        app.ask(strings.length[lang].replace('$distance', value.replace('.', ',')));
                    } else {
                        app.ask(strings.no_time[lang]);
                    }
                },
                MapIntent() {
                    // TODO ? not possible to shown the map, and no clickable links
                    const ann = annotations[lang][app.getSessionAttribute('annId')];
                    if (hasProp(ann, 'hasMap')) {
                        const title = ann.name;
                        app.showSimpleCard(title, ann.hasMap).ask(strings.map[lang]);
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
