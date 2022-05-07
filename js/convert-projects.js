/* 
1. import packages
*/
const { xml2js, js2xml } = require("xml-js");
const fs = require("fs");

/* 
2. get xml files
*/
const awardsXmlPath = "./src/awards-import-reference-220504.xml";
const awardsXmlInput = fs.readFileSync(awardsXmlPath).toString();
const projectsXmlPath = "./src/projects-export-220505.xml";
const projectsXmlInput = fs.readFileSync(projectsXmlPath).toString();
const mediaXmlPath = "./src/media-export-220504.xml";
const mediaXmlInput = fs.readFileSync(mediaXmlPath).toString();
const projectsRefXmlPath = "./src/projects-import-reference-220504.xml";
const projectsRefXmlInput = fs.readFileSync(projectsRefXmlPath).toString();

/* 
3. convert xml to json
*/
const awardsJsonResult = xml2js(awardsXmlInput, { compact: true, spaces: 2 });
const projectsJsonResult = xml2js(projectsXmlInput, {
	compact: true,
	spaces: 2,
});
const mediaJsonResult = xml2js(mediaXmlInput, {
	compact: true,
	spaces: 2,
});
const projectsRefJsonResult = xml2js(projectsRefXmlInput, {
	compact: true,
	spaces: 2,
});

/* 
4. write json conversion file for reference
*/
fs.writeFileSync(
	"./dist/projects/awardsRef-JsonReference.json",
	JSON.stringify(awardsJsonResult)
);
fs.writeFileSync(
	"./dist/projects/projects-JsonReference.json",
	JSON.stringify(projectsJsonResult)
);
fs.writeFileSync(
	"./dist/projects/mediaRef-JsonReference.json",
	JSON.stringify(mediaJsonResult)
);
fs.writeFileSync(
	"./dist/projects/projectsRef-JsonReference.json",
	JSON.stringify(projectsRefJsonResult)
);

/* 
5. transform the json object
*/
let awardPost = awardsJsonResult.data.post;
let projectPost = projectsJsonResult.data.post;
let mediaPost = mediaJsonResult.data.post;

// for each project
for (let i = 0; i < projectPost.length; i++) {
	/* 
	5.1 transform awards to pipe separated slug strings
	*/
	let awardName;
	let awardSlugs = [];
	let projectAwards = projectPost[i].Awards.row;
	// if the project has an award
	if (projectAwards != undefined) {
		// for each award
		for (let j = 0; j < projectAwards.length; j++) {
			// get award name from inconsistent data
			if (projectAwards[j].award_name._cdata != undefined) {
				awardName = projectAwards[j].award_name._cdata;
			} else if (projectAwards[j].award_name._text != undefined) {
				awardName = projectAwards[j].award_name._text;
			}
			// add slug values to array based on comparison function
			awardSlugs.push(getAwardSlug(awardName));
		}
	}
	// create slug string
	let awardsSlugString = awardSlugs.join("|");
	// replace post awards with slug string
	projectPost[i].Awards = {};
	projectPost[i].Awards._text = awardsSlugString;

	/* 
	5.2 transform lead architects and team to pipe separated slug strings
	*/
	let projectLeads = projectPost[i].LeadArchitects.row;
	let projectTeam = projectPost[i].ProjectTeam.row;
	let personSlug;
	let personSlugs = [];
	if (projectLeads != undefined) {
		// for each project lead
		for (let j = 0; j < projectLeads.length; j++) {
			// get person slug
			personSlug = projectLeads[j].architect._text;
			// push slug to array
			if (personSlug != undefined) {
				personSlugs.push(personSlug);
			}
		}
	}
	if (projectTeam != undefined) {
		// for each project team member
		for (let j = 0; j < projectTeam.length; j++) {
			// get person slug
			personSlug = projectTeam[j].employee._text;
			// push slug to array
			if (personSlug != undefined) {
				personSlugs.push(personSlug);
			}
		}
	}
	// create slug string
	let personSlugString = personSlugs.join("|");
	// add slug string to new Team key
	projectPost[i].Team = {};
	projectPost[i].Team._text = personSlugString;
	// delete old project leads and team arrays
	delete projectPost[i].LeadArchitects;
	delete projectPost[i].ProjectTeam;

	/* 
	5.3 transform affiliates to pipe separated slug strings
	*/
	// Might be fine as is

	/* 
	5.4 transform press strings to pipe separated slug strings
	*/
	let projectPress = projectPost[i].KeepReading.row;
	let pressSlug;
	let pressSlugs = [];
	if (projectPress != undefined) {
		// for each press item
		for (let j = 0; j < projectPress.length; j++) {
			// get press slug
			pressSlug = projectPress[j].press._text;
			// push slug to array
			if (pressSlug != undefined) {
				pressSlugs.push(pressSlug);
			}
		}
	}
	// create slug string
	let pressSlugString = pressSlugs.join("|");
	// add slug string to new Press key
	projectPost[i].Press = {};
	projectPost[i].Press._text = pressSlugString;
	// delete old press array
	delete projectPost[i].KeepReading;

	/* 
	5.5 transform featured content to block content string
	*/
	let contentBlock = projectPost[i].FeaturedContent.row;
	let postContent = "";
	let layout = "";
	let postContentArr = [];

	if (contentBlock != undefined) {
		// for each featured content block
		for (let j = 0; j < contentBlock.length; j++) {
			layout = contentBlock[j].featured_content_layout._text;
			/*
			if the content block is 
			a pull quote or
			a single image or
			a double image or
			a custom code
			*/
			if (layout == "pull quote") {
				let pullquote = "";
				// don't know why but sometimes the key is _text or _cdata
				if (contentBlock[j].featured_content_caption._text) {
					// get the string
					pullquote = contentBlock[j].featured_content_caption._text;
					// wrap the string in block editor tags
					let pullquoteString = wrapPullquote(pullquote);
					// add the string to the content array
					postContentArr.push(pullquoteString);
				} else if (contentBlock[j].featured_content_caption._cdata) {
					// get the string
					pullquote = contentBlock[j].featured_content_caption._cdata;
					// create the block editor string
					let pullquoteString = wrapPullquote(pullquote);
					// add the string to the content array
					postContentArr.push(pullquoteString);
				}
			} else if (layout == "single image") {
				let singleImage = "";
				let singleImageId = "";
				let singleImageCaption = "";
				// if there's an image string
				if (contentBlock[j].featured_content_images._text) {
					// get the image url
					singleImage = contentBlock[j].featured_content_images._text;
					// get the image id
					singleImageId = getMediaId(singleImage);
				}
				// if there's a caption
				if (contentBlock[j].featured_content_caption._text) {
					// get the string
					singleImageCaption = contentBlock[j].featured_content_caption._text;
				}
				// create the block editor string
				let singleImageString = wrapSingleImage(
					singleImage,
					singleImageId,
					singleImageCaption
				);
				// add the string to the content array
				if (singleImageString) {
					postContentArr.push(singleImageString);
				}
			} else if (layout == "double image") {
				let doubleImageCaption = "";
				let doubleImageArr = [];
				let doubleImageIdArr = [];
				// if there's an image string
				if (contentBlock[j].featured_content_images._text) {
					// split the string into an array
					doubleImageArr =
						contentBlock[j].featured_content_images._text.split(",");
					// for each image string in the array
					for (let k = 0; k < doubleImageArr.length; k++) {
						// get the image id
						doubleImageIdArr.push(getMediaId(doubleImageArr[k]));
					}
				}
				// if there's a caption
				if (contentBlock[j].featured_content_caption._text) {
					// get the string
					doubleImageCaption = contentBlock[j].featured_content_caption._text;
				}
				// create the block editor string
				let doubleImageString = wrapDoubleImage(
					doubleImageArr,
					doubleImageIdArr,
					doubleImageCaption
				);
				// add the string to the content array
				postContentArr.push(doubleImageString);
			} else if (layout == "custom code") {
				let customCode = "";
				// if there's a custom code string
				if (contentBlock[j].featured_content_custom._cdata) {
					// get the string
					customCode = contentBlock[j].featured_content_custom._cdata;
					// add the string to the content array
					postContentArr.push(customCode);
				}
			}
		}
	}
	// combine the content array into a single string separated by returns
	postContent = postContentArr.join("\n\n");
	// create a project content key
	projectPost[i].Content = {};
	// assing the key the content string value
	projectPost[i].Content._cdata = postContent;
	// delete the old Featured Content key
	delete projectPost[i].FeaturedContent;

	/* 
	5.7 transform featured image fields to block content
	*/
	// get the image string
	let featuredImageUrl = projectPost[i].FeaturedImage._text;
	// if the image string exists
	if (featuredImageUrl != undefined) {
		// get the image id
		let featuredImageId = getMediaId(featuredImageUrl);
		// create the block editor string
		let featuredImageString = wrapFullImage(featuredImageUrl, featuredImageId);
		// add it to the start of the content string
		projectPost[i].Content._cdata =
			featuredImageString + "\n\n" + projectPost[i].Content._cdata;
	}
	// delete the old Featured Image key
	delete projectPost[i].FeaturedImage;

	/* 
	5.8 transform the categories to a featured button and project categories
	*/
	// split the categories string into an array
	let postCategories = projectPost[i].Categories._text.split("|");
	let isFeatured;
	// Search for Featured category
	if (postCategories.includes("Featured")) {
		isFeatured = "Yes";
	} else {
		isFeatured = "No";
	}
	// create a key for featured status
	projectPost[i].IsFeatured = {};
	// assign the featured status value
	projectPost[i].IsFeatured._text = isFeatured;

	let postCategoryArr = [];
	/*
	if the category is 
	Culture or Learn or Live or Work
	add the string to the category array
	*/
	if (postCategories.includes("Culture")) {
		postCategoryArr.push("Culture");
	}

	if (postCategories.includes("Learn")) {
		postCategoryArr.push("Learn");
	}

	if (postCategories.includes("Live")) {
		postCategoryArr.push("Live");
	}

	if (postCategories.includes("Work")) {
		postCategoryArr.push("Work");
	}
	// combine the array values into a single string separated by pipes
	let postCategoriesString = postCategoryArr.join("|");
	// replace the old categories string
	projectPost[i].Categories._text = postCategoriesString;
}

// Update the json
projectsJsonResult.data.post = projectPost;

/* 
6. write the transformed json file
*/
fs.writeFileSync(
	"./dist/projects/projects-jsonResult.json",
	JSON.stringify(projectsJsonResult)
);

/* 
7. convert json to xml
*/
const xmlOutput = js2xml(projectsJsonResult, { compact: true, spaces: 2 });

/* 
8. write xml output file
*/
fs.writeFileSync("./dist/projects/projects-xmlOutput.xml", xmlOutput);

/* 
Functions
*/

/*
compare the award title within a project
with the award list in the awards json file
to get the correct award slug
*/
function getAwardSlug(award) {
	let awardTitle, awardSlug;
	// loop through the award posts
	for (let k = 0; k < awardPost.length; k++) {
		if (awardPost[k].Title._cdata != undefined) {
			awardTitle = awardPost[k].Title._cdata;
		} else if (awardPost[k].Title._text != undefined) {
			awardTitle = awardPost[k].Title._text;
		}
		awardSlug = awardPost[k].Slug._text;
		if (award == awardTitle) {
			return awardSlug;
		}
	}
}

/*
compare the image url
with the media json file urls
to get the media id
*/
function getMediaId(imageUrl) {
	let mediaUrl, mediaId;
	// loop through the media posts
	for (let k = 0; k < mediaPost.length; k++) {
		mediaUrl =
			"https://fisherpartners.net/wp-content/uploads/" +
			mediaPost[k]._wp_attached_file._text;
		mediaId = mediaPost[k].ID._text;
		if (imageUrl == mediaUrl) {
			return mediaId;
		}
	}
}

/*
wrap the pull quote in
wordpress block tags
*/
function wrapPullquote(string) {
	let wrappedString =
		`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>` +
		string +
		`</p></blockquote>\n<!-- /wp:quote -->`;
	return wrappedString;
}

/*
wrap the image url and id
wordpress block tags
*/
function wrapFullImage(url, id) {
	let wrappedImageString =
		`<!-- wp:image {"align":"full","id":` +
		id +
		`,"sizeSlug":"full","linkDestination":"none"} -->\n<figure class="wp-block-image alignfull size-full"><img src="` +
		url +
		`" alt="" class="wp-image-` +
		id +
		`"/></figure>\n<!-- /wp:image -->`;
	return wrappedImageString;
}

/*
wrap the image url, id and caption
wordpress block tags
*/
function wrapSingleImage(url, id, caption) {
	let wrappedImageString;
	if (caption) {
		wrappedImageString =
			`<!-- wp:image {"align":"center","id":` +
			id +
			`} -->\n<div class="wp-block-image"><figure class="aligncenter"><img src="` +
			url +
			`" alt="" class="wp-image-` +
			id +
			`"/><figcaption>` +
			caption +
			`</figcaption></figure></div>\n<!-- /wp:image -->`;
	} else {
		wrappedImageString =
			`<!-- wp:image {"align":"center","id":` +
			id +
			`} -->\n<div class="wp-block-image"><figure class="aligncenter"><img src="` +
			url +
			`" alt="" class="wp-image-` +
			id +
			`"/></figure></div>\n<!-- /wp:image -->`;
	}
	return wrappedImageString;
}

/*
for each image in the double image gallery
wrap the image url, id and caption
wordpress block tags
*/
function wrapDoubleImage(urlArray, idArray, caption) {
	let wrappedImageStringArr = [];
	let wrappedImageString;
	let wrappedGalleryString;
	for (let k = 0; k < urlArray.length; k++) {
		wrappedImageString =
			`<!-- wp:image {"id":` +
			idArray[k] +
			`,"sizeSlug":"large","linkDestination":"none"} -->\n<figure class="wp-block-image size-large"><img src="` +
			urlArray[k] +
			`" alt="" class="wp-image-` +
			idArray[k] +
			`"/></figure>\n<!-- /wp:image -->\n`;
		wrappedImageStringArr.push(wrappedImageString);
	}
	if (caption) {
		wrappedGalleryString =
			`<!-- wp:gallery {"linkTo":"none"} -->\n<figure class="wp-block-gallery has-nested-images columns-default is-cropped">` +
			wrappedImageStringArr.join("\n") +
			`<figcaption class="blocks-gallery-caption">` +
			caption +
			`</figcaption></figure>\n<!-- /wp:gallery -->`;
	} else {
		wrappedGalleryString =
			`<!-- wp:gallery {"linkTo":"none"} -->\n<figure class="wp-block-gallery has-nested-images columns-default is-cropped">` +
			wrappedImageStringArr.join("\n") +
			`</figure>\n<!-- /wp:gallery -->`;
	}

	return wrappedGalleryString;
}
