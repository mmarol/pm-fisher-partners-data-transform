// 1. import packages
const { xml2js, js2xml } = require("xml-js");
const fs = require("fs");

// 2. get xml file
const xml_path = "./src/team-export-220427.xml";
const xmlInput = fs.readFileSync(xml_path).toString();

// 3. convert xml to json
const jsonResult = xml2js(xmlInput, { compact: true, spaces: 2 });

// 4. write json conversion file fore reference
fs.writeFileSync(
	"./dist/people/people-jsonReference.json",
	JSON.stringify(jsonResult)
);

// 5. transform the json object
let post = jsonResult.data.post;

// for each post
for (let i = 0; i < post.length; i++) {
	// Set show/hide button values
	let showHide = post[i].HideinTeamList._text;

	if (showHide == undefined) {
		showHide = "Show";
	} else {
		showHide = "Hide";
	}

	post[i].HideinTeamList._text = showHide;

	// Title case the roles
	const role = post[i].Role._text;
	if (role) {
		post[i].Role._text = titleCase(role);
	}
}

// Update the json
jsonResult.data.post = post;

// 6. write the transformed json file
fs.writeFileSync(
	"./dist/people/people-jsonResult.json",
	JSON.stringify(jsonResult)
);

// 7. convert json to xml
const xmlOutput = js2xml(jsonResult, { compact: true, spaces: 2 });

// 8. write xml output file
fs.writeFileSync("./dist/people/people-xmlOutput.xml", xmlOutput);

// Functions
function titleCase(str) {
	str = str.toLowerCase().split(" ");
	for (var i = 0; i < str.length; i++) {
		str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
	}
	return str.join(" ");
}
