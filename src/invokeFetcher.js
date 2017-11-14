//this is only a test file

const Fetcher = require("./fetcher");

const f = new Fetcher("seefeld", () => {
    console.log("got all seefeld data");
    console.log(f.annotations.length);
    console.log(f.annotations[0]);
});

console.log("done");