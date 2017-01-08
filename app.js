'use strict';

/* 	Is there a way to make this string using an object, like using $.param? Quick google search didn't turn up anything
 	Also the only way I know of not putting my client secret in a public repo is by doing it server side, which
 	is impossible here; can anything be done?
*/  
const anilistEndPoint = 'https://anilist.co/api/';
const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
const anilistCharSearch = anilistEndPoint + 'character/search/';
const anilistCharPage = anilistEndPoint + ''

// These chain calls might make Promises appealing, but they really depend on the chain executing in order,
// so this might be simpler?
const queryAnilist = function(query) {
	// Send POST to anilist API for client credentials token
	// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
	// These tokens expire after 1 hour, ideally I would store the token and re-use it until it expires, but
	// time constraints force me to simply fetch a new one with each search for now
	$.post(anilistAuthTokenPost, function(data) {
		const anilistAccessToken = data.access_token;
		// GET with token
		$.get(anilistCharSearch + encodeURIComponent(query) + '?access_token=' + anilistAccessToken, function(data) {
			const characterID = data[0].id;
			console.log(data);
			// GET full page data with ID
			$.get(anilistEndPoint + 'character/' + characterID + '/page?access_token=' + anilistAccessToken, function(data) {
				console.log(data);
				// anilist has ~! and !~ markdowns to hide spoilers, have to filter that out
				// Stretch goal: show excluded text when hovered over (as anilist does)
				$('.long-description').html(data.info.replace(/~!.*?!~*/g, ''));
				return data;
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

$(document).ready(function() {
	const characterData = queryAnilist("shinobu oshino");
});