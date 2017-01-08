'use strict';

/* 	Is there a way to make this string using an object, like using $.param? Quick google search didn't turn up anything
 	Also the only way I know of not putting my client secret in a public repo is by doing it server side, which
 	is impossible here; can anything be done?
*/  
const anilistAuthTokenPost = 'https://anilist.co/api/auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';

const queryAnilist = function(query) {
	// Send POST to anilist API for client credentials token (https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials)
	$.post(anilistAuthTokenPost, function(data) {
		console.log(data);
	});
}

$(document).ready(function() {
	queryAnilist("shinobu oshino");
});