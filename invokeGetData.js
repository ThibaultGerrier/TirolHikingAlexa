const Fetcher = require("./getData");

/*const f = new Fetcher("seefeld", () => {
    console.log("got all seefeld data");
    console.log(f.annotations.length);
    console.log(f.annotations[0]);
});*/

const randNumber = max => Math.floor(Math.random() * max);

for(let i =0; i< 20; i++){
    console.log(randNumber(5));
}

console.log("done");