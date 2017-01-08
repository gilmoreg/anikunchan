'use strict';

/* 	Is there a way to make this string using an object, like using $.param? Quick google search didn't turn up anything
 	Also the only way I know of not putting my client secret in a public repo is by doing it server side, which
 	is impossible here; can anything be done?
*/  
const anilistEndPoint = 'https://anilist.co/api/';
const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
const anilistCharSearch = anilistEndPoint + 'character/search/';
const anilistCharPage = anilistEndPoint + '';

const wikiaEndPoint = 'https://www.wikia.com/api/v1/Search';
const wikiaCrossWikiEndPoint = wikiaEndPoint + '/CrossWiki?expand=1&limit=1&query=';


// These chain calls might make Promises appealing, but they really depend on the chain executing in order,
// so this might be simpler?
const queryAnilist = function(query) {
	// Send POST to anilist API for client credentials token
	// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
	// These tokens expire after 1 hour, ideally I would store the token and re-use it until it expires, but
	// time constraints force me to simply fetch a new one with each search for now
	$.post(anilistAuthTokenPost, function(data) {
		const anilistAccessToken = '?access_token=' + data.access_token;
		// GET with token
		$.get(anilistCharSearch + query + anilistAccessToken, function(data) {
			const characterID = data[0].id; // assuming for now first result is the best one
			// GET full page data with ID
			$.get(anilistEndPoint + 'character/' + characterID + '/page' + anilistAccessToken, function(data) {
				renderAnilistCharacterData(data);
			})
			.fail(function(response) {
				// TODO: something more sophisticated for error handling
				alert('Error: ' + response.responseText);
			});

		})
		.fail(function(response) {
			// TODO: something more sophisticated for error handling
			alert('Error: ' + response.responseText);
		});
	})
	.fail(function(response) {
		// TODO: something more sophisticated for error handling
		alert('Error: ' + response.responseText);
	});
}

const queryWikia = function(query) {
	// Cross search all Wikis to get the most relevant one
	// Using YML to get around Wikia's lack of support for CORS or JSONP
	const ymlQuery = 'select * from json where url="http://www.wikia.com/api/v1/Search/CrossWiki?expand=1&lang=en&limit=1&batch=1&query=' + query + '"';
	console.log(ymlQuery);
	$.ajax({
		url: "https://query.yahooapis.com/v1/public/yql",
	 	data: { 
	 		q: ymlQuery,
	 		format : "json" 
	 	}
	}).done(function(response) {
		//console.log(response.query.results.json);
		const wikiSearch = response.query.results.json.items.url + 'api/v1/Search/List?limit=1&minArticleQuality=10&batch=1&namespaces=0%2C14&query=' + query;
		const ymlQuery = 'select * from json where url="' + response.query.results.json.items.url + 
			'api/v1/Search/List?limit=1&minArticleQuality=10&batch=1&namespaces=0%2C14&query=' + query + '"';
		// http://www.wikia.com/api/v1/Search/CrossWiki?expand=1&lang=en&limit=1&batch=1&query=' + query + '"';
		$.ajax({
			url: "https://query.yahooapis.com/v1/public/yql",
		 	data: { 
		 		q: ymlQuery,
		 		format : "json" 
		 	}
		}).done(function(response) { 			
			renderWikiaCharacterData(response);
		});

	});
}

const renderAnilistCharacterData = function(data) {
	$('.portrait-image').html('<img src="' + data.image_url_lge + '">');
	$('.char-name').html(data.name_first + ' ' + data.name_last);
	$('.jpn-char-name').html(data.name_japanese);
	$('.alt-char-name').html(data.name_alt);
	// anilist has ~! and !~ markdowns to hide spoilers, have to filter that out
	// Stretch goal: show excluded text when hovered over (as anilist does)
	// Issue: some of these descriptions can be rather long - I might cut them down to a certain length and add an ellipsis
	$('.long-description').html(data.info.replace(/~!.*?!~*/g, '').replace(/[<]br[^>]*[>]/gi,'')) // also removes line breaks
		.append(' (Source: <a href="https://anilist.co/character/' + data.id + '/" target="_blank">anilist.co</a>)');
	
	$('.appears-in').empty();
	data.anime.forEach(function(anime) {
		$('.appears-in').append('<li><a href="http://anilist.co/anime/' + anime.id + '" target="_blank">' + anime.title_english + '</a></li>');
	});
				
}

const renderWikiaCharacterData = function(data) {
	$('.description').html(data.query.results.json.items.snippet)
				.append(' (Source: <a href="' + data.query.results.json.items.url + '" target="_blank">wikia.com</a>)');
}

$(document).ready(function() {
	const query = encodeURIComponent('rintarou okabe');
	queryAnilist(query);
	queryWikia('rintarou+okabe');
});