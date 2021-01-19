// const express = require('express');
// const bodyParser = require('body-parser');
// const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
// const { makeExecutableSchema } = require('graphql-tools');
// const fetch = require('node-fetch');

var fs = require('fs'),
		request = require('request');
		
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

// download('https://th.bing.com/th/id/OIP.9Lrp6MFLrsaocuHOsLuwfAHaJ4?w=185&h=247&c=7&o=5&pid=1.7', 'porte.png', function(){
//   console.log('done');
// });

if (!fs.existsSync('./out')){
    fs.mkdirSync('./out');
}

var user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20';
var Browser = require("zombie");
var browser = new Browser({ userAgent: user_agent, debug: true, waitFor: 10000 });

var url = 'https://www.google.com/search?q=lavabo';

browser.visit(url, function() {

	// fs.writeFile('portes.html.txt', browser.html(), function (err) {
	// 	if (err) return console.log(err);
	// 	console.log('Hello World > helloworld.txt');
	// });

	var scrollCount = 0;
	var MAX = 0
	// store the interval id to clear in future
	var intr = setInterval(function() {
		browser.window.scrollTo(0, scrollCount * 1000)
		
		console.log('scrollY: ', browser.window.scrollY)
		console.log('scrollY: ', scrollCount)

		// clear the interval if `i` reached 100
		if (++scrollCount >= MAX) clearInterval(intr);
	}, 1000)
	  

	setTimeout(() => {
		const dom = new JSDOM(browser.html());
	
		const res = browser.document.querySelectorAll("img")

		const base64DataArray = []
	
		var stream = fs.createWriteStream("./out/google-image.txt");
		stream.on('error', console.error);
		
		let i = 0
		res.forEach(img => {
			
			stream.write(img.src + '\n\n');

			if (img.src && img.src != "" && img.src[0] == "d") {
				var base64Data = img.src.replace(/^data:image\/jpeg;base64,/, "").replace(/^data:image\/png;base64,/, "");

				if (!base64DataArray.includes(base64Data)) {
					base64DataArray.push(base64Data)
			
					fs.writeFile("./out/out-" + i + ".png", base64Data, 'base64', function(err) {
						console.log(err);
					});
					
					i++
				}
			}
				
		})
		stream.end();

	}, 1000 * MAX)
});

// var phantom = require('node-phantom');
// 
// phantom.create(function(err,ph) {
//   return ph.createPage(function(err,page) {
//     return page.open("http://tilomitra.com/repository/screenscrape/ajax.html", function(err,status) {
//       console.log("opened site? ", status);
//       page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js', function(err) {
//         //jQuery Loaded.
//         //Wait for a bit for AJAX content to load on the page. Here, we are waiting 5 seconds.
//         setTimeout(function() {
//           return page.evaluate(function() {
//             //Get what you want from the page using jQuery. A good way is to populate an object with all the jQuery commands that you need and then return the object.
//             var h2Arr = [],
//             pArr = [];
//             $('h2').each(function() {
//               h2Arr.push($(this).html());
//             });
//             $('p').each(function() {
//               pArr.push($(this).html());
//             });
 
//             return {
//               h2: h2Arr,
//               p: pArr
//             };
//           }, function(err,result) {
//             console.log(result);
//             ph.exit();
//           });
//         }, 5000);
//       });
//     });
//   });
// });

// // The GraphQL schema in string form
// const typeDefs = `
//   type Query { fetch: Int }
// `;

// // The resolvers
// const resolvers = {
//   Query: {
//     fetch: () => {
		
// 			fetch('https://www.google.com/search?q=porte&hl=fr&sxsrf=ALeKk01wDkhC9O-6OyrSu3UCu7nYignJFw:1610936516500&source=lnms&tbm=isch&sa=X&ved=2ahUKEwjC6siWtqTuAhWQahUIHQ94AIcQ_AUoAXoECBEQAw&biw=2560&bih=1297')
// 				.then(res => res.text())
// 				.then(body => console.log(body));

//       return 1
//     }
// 	},
// };

// // Put together a schema
// const schema = makeExecutableSchema({
//   typeDefs,
//   resolvers,
// });

// // Initialize the app
// const app = express();

// // The GraphQL endpoint
// app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

// // GraphiQL, a visual editor for queries
// app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

// // Start the server
// app.listen(3000, () => {
//   console.log('Go to http://localhost:3000/graphiql to run queries!');
// });


// const GoogleImages = require('google-images');
 
// const client = new GoogleImages('c7c89f5a34f9eac29', 'AIzaSyAx0ICPp6zt0zguhHCFrohI3KoqIv_uUFc');
// const options = {
// 	page: 1,
// 	// size: "medium",
// 	// type: "photo"
// };
