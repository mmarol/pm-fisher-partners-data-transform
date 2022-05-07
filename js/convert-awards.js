// 1. import packages
const { xml2js, js2xml } = require("xml-js");
const fs = require("fs");

// 2. get xml file
const xml_path = "./src/awards-export-220428.xml";
const xmlInput = fs.readFileSync(xml_path).toString();

// 3. convert xml to json
const jsonResult = xml2js(xmlInput, { compact: true, spaces: 2 });

// 4. write json conversion file fore reference
fs.writeFileSync(
	"./dist/awards/awards-jsonReference.json",
	JSON.stringify(jsonResult)
);

// 5. transform the json object
let data = jsonResult.data;
let post = jsonResult.data.post;
let awards = [];

// for each post
for (let i = 0; i < post.length; i++) {
	if (post[i].Awards.row != undefined) {
		if (post[i].Awards.row instanceof Array) {
			for (let j = 0; j < post[i].Awards.row.length; j++) {
				let award = post[i].Awards.row[j];
				awards.push(award);
			}
		} else {
			let award = post[i].Awards.row;
			awards.push(award);
		}
	}
}

for (let k = 0; k < awards.length; k++) {
	awards[k].id = 200 + k;
}
// console.log(awards);

// Update the json
jsonResult.data.post = awards;

// 6. write the transformed json file
fs.writeFileSync(
	"./dist/awards/awards-jsonResult.json",
	JSON.stringify(jsonResult)
);

// 7. convert json to xml
const xmlOutput = js2xml(jsonResult, { compact: true, spaces: 2 });

// 8. write xml output file
fs.writeFileSync("./dist/awards/awards-xmlOutput.xml", xmlOutput);

// Functions

function getRandomID(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
