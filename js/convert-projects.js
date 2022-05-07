// 1. import packages
const { xml2js, js2xml } = require("xml-js");
const fs = require("fs");

// 2. get xml files
const awardsXmlPath = "./src/awards-import-reference-220504.xml";
const awardsXmlInput = fs.readFileSync(awardsXmlPath).toString();
// const projectsXmlPath = "./src/projects-export-test-220505.xml";
const projectsXmlPath = "./src/projects-export-220505.xml";
const projectsXmlInput = fs.readFileSync(projectsXmlPath).toString();
const mediaXmlPath = "./src/media-export-220504.xml";
const mediaXmlInput = fs.readFileSync(mediaXmlPath).toString();
const projectsRefXmlPath = "./src/projects-import-reference-220504.xml";
const projectsRefXmlInput = fs.readFileSync(projectsRefXmlPath).toString();

// 3. convert xml to json
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

// 4. write json conversion file for reference
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

// 5. transform the json object
let awardPost = awardsJsonResult.data.post;
let projectPost = projectsJsonResult.data.post;
let mediaPost = mediaJsonResult.data.post;
// for each project

for (let i = 0; i < projectPost.length; i++) {
	// 5.1 transform awards to pipe separated slug strings
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

	// 5.2 transform lead architects and team to pipe separated slug strings
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
	// delete old press array
	delete projectPost[i].LeadArchitects;
	delete projectPost[i].ProjectTeam;

	// 5.3 transform affiliates to pipe separated slug strings
	// Might be fine as is

	// 5.4 transform press strings to pipe separated slug strings
	let projectPress = projectPost[i].KeepReading.row;
	let pressSlug;
	let pressSlugs = [];
	if (projectPress != undefined) {
		// for each press item
		for (let j = 0; j < projectPress.length; j++) {
			// get press slug
			/* the press posts got added to the database
			 * with a -2 suffix for some reason
			 */
			pressSlug = projectPress[j].press._text + "-2";
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

	// 5.5 transform featured content to block content string
	let contentBlock = projectPost[i].FeaturedContent.row;
	let postContent = "";
	let layout = "";
	let postContentArr = [];

	if (contentBlock != undefined) {
		// for each featured content block

		for (let j = 0; j < contentBlock.length; j++) {
			layout = contentBlock[j].featured_content_layout._text;
			if (layout == "pull quote") {
				// if pull quote
				let pullquote = "";
				if (contentBlock[j].featured_content_caption._text) {
					pullquote = contentBlock[j].featured_content_caption._text;
					let pullquoteString = wrapPullquote(pullquote);
					postContentArr.push(pullquoteString);
				} else if (contentBlock[j].featured_content_caption._cdata) {
					pullquote = contentBlock[j].featured_content_caption._cdata;
					let pullquoteString = wrapPullquote(pullquote);
					postContentArr.push(pullquoteString);
				}
			} else if (layout == "single image") {
				// if single image
				let singleImage = "";
				let singleImageId = "";
				let singleImageCaption = "";
				if (contentBlock[j].featured_content_images._text) {
					singleImage = contentBlock[j].featured_content_images._text;
					singleImageId = getMediaId(singleImage);
				}
				if (contentBlock[j].featured_content_caption._text) {
					singleImageCaption = contentBlock[j].featured_content_caption._text;
				}

				let singleImageString = wrapSingleImage(
					singleImage,
					singleImageId,
					singleImageCaption
				);

				if (singleImageString) {
					postContentArr.push(singleImageString);
				}
			} else if (layout == "double image") {
				// if double image
				let doubleImageCaption = "";
				let doubleImageArr = [];
				let doubleImageIdArr = [];
				if (contentBlock[j].featured_content_images._text) {
					doubleImageArr =
						contentBlock[j].featured_content_images._text.split(",");

					for (let k = 0; k < doubleImageArr.length; k++) {
						doubleImageIdArr.push(getMediaId(doubleImageArr[k]));
					}
				}
				if (contentBlock[j].featured_content_caption._text) {
					doubleImageCaption = contentBlock[j].featured_content_caption._text;
				}
				let doubleImageString = wrapDoubleImage(
					doubleImageArr,
					doubleImageIdArr,
					doubleImageCaption
				);
				postContentArr.push(doubleImageString);
			} else if (layout == "custom code") {
				// if custom code
				let customCode = "";
				if (contentBlock[j].featured_content_custom._cdata) {
					customCode = contentBlock[j].featured_content_custom._cdata;
					postContentArr.push(customCode);
				}
			}
		}
	}
	// console.log(postContentArr);
	postContent = postContentArr.join("\n\n");
	projectPost[i].Content = {};
	projectPost[i].Content._cdata = postContent;
	// delete old Featured Content
	delete projectPost[i].FeaturedContent;

	// 5.7 transform featured image fields to block content
	let featuredImageUrl = projectPost[i].FeaturedImage._text;
	if (featuredImageUrl != undefined) {
		let featuredImageId = getMediaId(featuredImageUrl);
		let featuredImageString = wrapFullImage(featuredImageUrl, featuredImageId);
		// create Content node and assign string
		projectPost[i].Content._cdata =
			featuredImageString + "\n\n" + projectPost[i].Content._cdata;
	}
	// delete old Featured Image
	delete projectPost[i].FeaturedImage;

	// projectPost[i].Content._cdata = projectPost[i].Content._cdata.replaceAll(
	// 	"fisherpartners.net",
	// 	"pm-fisher-partners.local"
	// );
	// console.log(projectPost[i].Content._cdata);

	// 5.8 transform the categories to a featured button and project categories
	let postCategories = projectPost[i].Categories._text.split("|");
	let isFeatured;
	// Search for Featured category
	if (postCategories.includes("Featured")) {
		isFeatured = "Yes";
	} else {
		isFeatured = "No";
	}
	projectPost[i].IsFeatured = {};
	projectPost[i].IsFeatured._text = isFeatured;

	let postCategoryArr = [];
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

	let postCategoriesString = postCategoryArr.join("|");
	// replace old categories string
	projectPost[i].Categories._text = postCategoriesString;
}

// Update the json
projectsJsonResult.data.post = projectPost;

// 6. write the transformed json file
fs.writeFileSync(
	"./dist/projects/projects-jsonResult.json",
	JSON.stringify(projectsJsonResult)
);

// 7. convert json to xml
const xmlOutput = js2xml(projectsJsonResult, { compact: true, spaces: 2 });

// 8. write xml output file
fs.writeFileSync("./dist/projects/projects-xmlOutput.xml", xmlOutput);

// Functions

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

function wrapPullquote(string) {
	let wrappedString =
		`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>` +
		string +
		`</p></blockquote>\n<!-- /wp:quote -->`;
	return wrappedString;
}

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
