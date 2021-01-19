const puppeteer = require('puppeteer');
const delay = require('delay');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs')
const fetch = require('node-fetch');

const decorations = require('./data/decorations.json')

const imagefinder = async ({keyword}) => {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const page = await browser.newPage();
	
	page.on('console', consoleObj => console.log(consoleObj.text()));

	await page.goto(
		`https://www.google.com/search?q=${keyword.replace(
		/ /g,
		'+',
		)}&source=lnms&tbm=isch&sa=X`,
	);

	await delay(1000);

	// let bodyHTML = await page.evaluate(() => document.body.innerHTML);
	// fs.writeFile('google.html', bodyHTML, function (err) {
	// 	if (err) return console.log(err);
	// });


	for (let i = 0; i < 10; i++) {
		await page.evaluate(() => {
			console.log('scrollHeight: ', window.document.body.scrollHeight)
			window.scrollBy(0, window.document.body.scrollHeight);
		});
		await delay(1000);
	}

	const imgs = await page.evaluate(() => {
		const elements = Array.from(document.querySelectorAll('img'));
		return elements.map(link => link.src);
	});
		
	await browser.close();

	// const imgs = stories
	//   .map(link => querystring.parse(url.parse(link).query).imgurl)
	//   .filter(img => img);

	return await Promise.resolve(imgs);
};

const base64DataArray = []
saveBase64Image = (img, filename) => {
	var base64Data = img.replace(/^data:image\/jpeg;base64,/, "")//.replace(/^data:image\/png;base64,/, "");

	if (!base64DataArray.includes(base64Data)) {
		base64DataArray.push(base64Data)

		fs.writeFile(filename, base64Data, 'base64', function(err) {
			// console.log(err);
		});

		return base64DataArray
	}
	return
}

const urlArray = []
async function download(url, filename) {
	if (!urlArray.includes(url)) {
		urlArray.push(url)

		const response = await fetch(url);
		const buffer = await response.buffer();
		fs.writeFile(filename, buffer, () => null);
		  // console.log(filename + ' finished downloading!'));
	}
}

fetchImages = (keyword) => {
	fs.mkdirSync('./out/' + keyword);

	imagefinder({
		keyword: keyword
	}).then(images => {
			// console.log('images: ', images)
			
		var stream = fs.createWriteStream("./out/" + keyword + "/google-image.txt");
		stream.on('error', console.error);
		
		let i = 0
		images.map((img) => {
			
			stream.write(img + '\n\n');

			const filename = "./out/" + keyword + "/" + keyword + "-" + i + ".jpg"
			if (img && img != "" && img[0] == "d") {
				saveBase64Image(img, filename)
				i++
			}
			else if (img && img != null && img[0] == "h") {
				download(img, filename)
				i++
			}
			
		})
		stream.end();
	})
}

// fs.rmdir('./out', { recursive: true }, async (err) => {
// 	if (err) {
// 		throw err;
// 	}

	console.log(`${'./out'} is deleted!`);
	
	if (!fs.existsSync('./out')){
		fs.mkdirSync('./out');
	}

	for (let i = 0; i < decorations.length; i++) {
		console.log('fetch ' + decorations[i])
		fetchImages(decorations[i])
		await delay(15000)
	}


// });