const Fetcher = require('./fetcher');

const { MongoClient } = require('mongodb');
const assert = require('assert');

const url = 'mongodb://localhost:27017';
const dbName = 'hikingAlexa';

const getAnn = (cb) => {
    let annotationsDe = [];
    let annotationsEn = [];
    const seefeldDataDE = new Fetcher('seefeld', 'de', () => {
        annotationsDe = annotationsDe.concat(Object.values(seefeldDataDE.annotations));
        const mayrhofenDataDE = new Fetcher('mayrhofen_gdi', 'de', () => {
            annotationsDe = annotationsDe.concat(Object.values(mayrhofenDataDE.annotations));
            const seefeldDataEN = new Fetcher('seefeld', 'en', () => {
                annotationsEn = annotationsEn.concat(Object.values(seefeldDataEN.annotations));
                const mayrhofenDataEN = new Fetcher('mayrhofen_gdi', 'en', () => {
                    annotationsEn = annotationsEn.concat(Object.values(mayrhofenDataEN.annotations));
                    cb(annotationsDe, annotationsEn);
                });
            });
        });
    });
};

MongoClient.connect(url, (err, client) => {
    assert.equal(null, err);
    console.log('Connected successfully to server');
    const db = client.db(dbName);

    const collectionDe = db.collection('annotations_de');
    const collectionEn = db.collection('annotations_en');

    getAnn((annotationsDe, annotationsEn) => {
        collectionDe.insertMany((annotationsDe), (insertDeErr, insertDeResult) => {
            console.log(insertDeErr);
            assert.equal(insertDeErr, null);
            console.log(insertDeResult);
            console.log('Annotations De addded');
            collectionEn.insertMany((annotationsEn), (insertEnErr, insertEnResult) => {
                console.log(insertEnErr);
                assert.equal(insertEnErr, null);
                console.log(insertEnResult);
                console.log('Annotations En addded');
                client.close();
            });
        });
    });
});
