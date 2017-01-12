'use strict';
/*
	Working notes:

	Anilist character search is pretty finicky and doesn't return some expected results, but there really isn't a better source

	Certain searches, especially for characters with no last names, don't make for good Imgur or Youtube searches

*/
let state = {
	searchStrings: [],
	anilistAccessToken: {},
	imgurPage: 0,
	googlePage: 0
}

const Google = ( () => {
	let googlePage = state.googlePage;
	const googleEndpoint = 'https://www.googleapis.com/customsearch/v1';

	const googleAPICall = (query, callback) => {
		const gQuery = {
			q: query,
			key: 'AIzaSyCTYqRMF86WZ_W4MRPrha8SfozzzbdsIvc',
			cx: '017818390200612997677:nulntbij5kc',
			searchType: 'image',
			num: 8,
			safe: 'medium',
			start: googlePage*8+1
		}
		$.getJSON(googleEndpoint, gQuery, callback);
	}

	const displayGoogleData = (data) => {
		const numResults = data.queries.request[0].totalResults;

		if(data.length===0) {
			$('.google-image-container').addClass('hidden');
			return;
		}
		$('.google-image-container').removeClass('hidden');
		
		let html = '';
    	data.items.forEach( (element, index) => {
    		if(element.image) {
    			html += `<div class="gimage" link="${element.link}"><img src="${element.image.thumbnailLink}" alt="${element.snippet}"></div>`;
    		}
    	});

    	// HTML
    	$('.googleimages').html(html);

    	// Event handlers
    	$('.googleimages').on('click','.gimage', (event) => {
    		const link = $(event.target).closest('.gimage').attr('link');
    		let html = `<a href="${link}" target="_blank"><img src="${link}" class="google-image"></a>`;
    		openModal(html);
    	});
    	
    	// Pagination
    	$('#gimages-prev, #gimages-next').off('click').removeClass('dim-arrow');

    	if(googlePage>0) {
			$('#gimages-prev').on('click', (event) => {
	    		event.preventDefault();
	    		$('#gimages-prev').off('click');
	    		googlePage--;
	    		googleAPICall(data.queries.request[0].searchTerms,displayGoogleData);
	    	});
    	}
    	else {
    		$('#gimages-prev').off('click');
    		$('#gimages-prev').addClass('dim-arrow');
    	}

    	if(googlePage*6 < numResults) {
			$('#gimages-next').on('click', (event) => {
	    		event.preventDefault();
	    		$('#gimages-next').off('click');
	    		googlePage++;
	    		googleAPICall(data.queries.request[0].searchTerms,displayGoogleData);
	    	});
    	}
    	else {
    		$('#gimages-next').off('click');
    		$('#gimages-next').addClass('dim-arrow');
    	}

	}

	return {
		queryGoogleImages: (query) => {
			googleAPICall(query,displayGoogleData);
		}
	}
})();

const YouTube = ( () => {
	const youTubeEndpoint = 'https://www.googleapis.com/youtube/v3/search';
	const youTubeAPICall = (query, token, callback) => {
		const  ytQuery = {
	    	part: 'snippet',
		    key: 'AIzaSyCTYqRMF86WZ_W4MRPrha8SfozzzbdsIvc',
		    type: 'video',
		    maxResults: '4',
		    pageToken: token,
		    videoEmbeddable: true,
		    safeSearch: 'moderate',
		    q: query
		} 	
		$.getJSON(youTubeEndpoint, ytQuery, callback);
	}

	const displayData = (data) => {
		if(data.length===0) {
			$('.youtube-video-container').addClass('hidden');
			return;
		}
		$('.youtube-video-container').removeClass('hidden');

    	let html = '';
    	data.items.forEach( (element, index) => {
    		if(element.id.videoId) {
    			const snippet = element.snippet;
    			// QUESTION: is using id like this a good idea? (puts the Youtube video ID in the html to be retreived by javascript, i.e. storing data in the DOM)
    			let title = snippet.title;
    			if(title.length > 50) title = title.substring(0,50) + '...';
    			html += `<div class="ytvid" id="${element.id.videoId}"><div class="yt-thumb"><img src="${snippet.thumbnails.default.url}" alt="${title}"></div><div class="yt-desc">${title}</div></div>`;
    		}
    	});

    	// HTML
    	$('.youtube-videos').html(html);

    	// Event handlers
    	$('.youtube-videos').on('click','.ytvid', (event) => {
    		let html = `<iframe src="https://www.youtube.com/embed/${$(event.target).closest('.ytvid').attr('id')}?autoplay=1" class="youtube-video"></iframe>`;
    		openModal(html);
    	});
    	
    	// Pagination
    	$('#yt-prev, #yt-next').off('click').removeClass('dim-arrow');

    	if(data.prevPageToken) {
			$('#yt-prev').on('click', (event) => {
	    		event.preventDefault();
	    		$('#yt-prev').off('click');
	    		youTubeAPICall(state.searchStrings.slice(-1)[0], data.prevPageToken, displayData);
	    	});
    	}
    	else {
    		$('#yt-prev').off('click');
    		$('#yt-prev').addClass('dim-arrow');
    	}

    	if(data.nextPageToken) {
			$('#yt-next').on('click', (event) => {
	    		event.preventDefault();
	    		$('#yt-next').off('click');
	    		youTubeAPICall(state.searchStrings.slice(-1)[0], data.nextPageToken, displayData);
	    	});
    	}
    	else {
    		$('#yt-next').off('click');
    		$('#yt-next').addClass('dim-arrow');
    	}
	}

	return {
		queryYouTube: (query, token) => {
			state.searchStrings.push(query);
			youTubeAPICall(query, token, displayData);
		}
	};
})();

const Anilist = ( () => {
	const anilistEndPoint = 'https://anilist.co/api/';
	let anilistAccessToken = state.anilistAccessToken;

	const getAnilistToken = () => {
		//if(Date.now() < anilistAccessToken.expires) return new Promise( (resolve,reject) => { resolve(); } ); 
		// Send POST to anilist API for client credentials token
		// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
		// These tokens expire after 1 hour, ideally I would store the token and re-use it until it expires, but
		// time constraints force me to simply fetch a new one with each search for now
		const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
		return new Promise( (resolve,reject) => {
			resolve($.post(anilistAuthTokenPost)); 
		});
	}

	const anilistCharSearch = (query) => {
		return new Promise( (resolve,reject) => {
			resolve( $.get(`${anilistEndPoint}character/search/${query}?access_token=${anilistAccessToken.access_token}`) );
		});
	}

	const anilistCharPage = (id) => {
		return new Promise( (resolve,reject) => {
			resolve( $.get(`${anilistEndPoint}character/${id}/page?access_token=${anilistAccessToken.access_token}`) );
		});
	}

	const name = (data) => {
		let n = data.name_first;
		if(data.name_last) n += ' ' + data.name_last;
		return n;
	}

	return {
		getCharacterData: (id, callback) => {
			getAnilistToken().then( (data) => {
				anilistAccessToken = data;
				anilistCharPage(id).then( (data) => {
					callback(data);
				});
			})
			.catch( (msg) => { console.log('err queryAnilist',msg); }); // This is not working - not catching errors earlier in the chain
		},
		characterSearch: (query, callback) => {
			getAnilistToken().then( (data) => {
				anilistAccessToken = data;
				anilistCharSearch(query).then( (data) => { 
					callback(data);
				});
			})
			.catch( (msg) => { console.log('err queryAnilist',msg); }); // This is not working - not catching errors earlier in the chain
		},
		render: (data) => {
			$('.portrait-image').html(`<img src="${data.image_url_lge}">`);
			$('.char-name').html(name(data));
			$('.jpn-char-name').html(data.name_japanese);
			$('.alt-char-name').html(data.name_alt);
			// anilist has ~! and !~ markdowns to hide spoilers, have to filter that out
			// Issue: some of these descriptions can be rather long - I might cut them down to a certain length and add an ellipsis
			let description = marked(data.info.replace(/~!.*?!~*/g, ''));
			//.replace(/[<]br[^>]*[>]/gi,'') // remove line breaks
			description	+= `(Source: <a href="https://anilist.co/character/${data.id}/" target="_blank">anilist.co</a>)`

			$('.long-description').html(description);
			$('.appears-in-list').empty();
			// Sorting anime by start date helps reduce bad Google results (due to ovas and shorts sometimes coming first)
			data.anime.sort( (a,b) => {
				return a.start_date_fuzzy - b.start_date_fuzzy;
			});
			data.anime.forEach((anime) => {
				$('.appears-in-list').append('<li><a href="https://anilist.co/anime/' + anime.id + '" target="_blank">' + anime.title_english + '</a></li>');
			});			
		},
		getName: (data) => {
			return name(data);
		}
	}
})();

const searchModal = () => {
	let html = '<div class="search-box">' + 
	'<form id="al-search-form" action="javascript:performSearch()"><input id="al-query" type="text" name="search" placeholder="Type a character name" required>' + 
	' <button type="submit" ><i class="fa fa-search" aria-hidden="true"></i></button></form></div><div class="al-search-results"</div>';
	openModal(html);
	$('#al-query').focus();
}

const performSearch = () => {
	const query = $('#al-query').val();
	Anilist.characterSearch(query, renderSearch);
	//closeModal();
}

const renderSearch = (data) => {
	// bad search is giving an Error object which throws an error when I try to ForEach on it
	let html = '';
	if(data.error) {
		$('.al-search-results').html("No results");
		return;
	}
	data.forEach( (element, index) => {
		//const desc = element. //
		let name = element.name_first;
		if(element.name_last) name += ' ' + element.name_last;
		html += `<div class="col-3 blue aniCharSearch" id="${element.id}"><img src="${element.image_url_med}" alt="${name}"><p>${name}</p></div>`;
	});
	$('.al-search-results').html(html);
	$('.aniCharSearch').on('click', (event) => {
		event.preventDefault();
		closeModal();
		Anilist.getCharacterData($(event.target).closest('.aniCharSearch').attr('id'), createPage);
	});
}

const createPage = (data) => {
	Anilist.render(data);
	const query = Anilist.getName(data) + ' ' + data.anime[0].title_english;
	YouTube.queryYouTube(query);
	Google.queryGoogleImages(query);
	setLinks(Anilist.getName(data));
	$('.background').removeClass('hidden');
}

const openModal = (content) => {
	$('.modal-content').html(content);
	$('.overlay').addClass('dim');
	$('#lightbox').removeClass('hidden');
	$('.overlay').on('click', (event) => {
		closeModal();
	});
}

const closeModal = () => {
	$('.modal-content').empty();
	$('.overlay').removeClass('dim');
	$('#lightbox').addClass('hidden');
	$('.overlay').off('click');
}

const setLinks = (query) => {
	let q = encodeURIComponent(query);
	let html = '';
	html += `<li><a href="https://www.google.com/#q=${q}+site:wikia.com" target="_blank">Wikia</a></li>`;
	html += `<li><a href="https://en.wikipedia.org/wiki/Special:Search/${query}" target="_blank">Wikipedia</a></li>`;
	html += `<li><a href="https://www.reddit.com/search?q=${query}" target="_blank">Reddit</a></li>`;
	html += `<li><a href="http://www.pixiv.net/search.php?s_mode=s_tag&word=${query}" target="_blank">Pixiv</a></li>`;
	html += `<li><a href="http://www.deviantart.com/browse/all/?section=&global=1&q=${query}" target="_blank">DeviantArt</a></li>`;
	$('.links-list').html(html);
}

$(document).ready(function() {
	searchModal();
});