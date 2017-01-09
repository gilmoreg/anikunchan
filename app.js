'use strict';
/*
	Working notes:

	Anilist character search is pretty finicky and doesn't return some expected results, but there really isn't a better source

	Certain searches, especially for characters with no last names, don't make for good Imgur or Youtube searches

*/
let state = {
	searchStrings: []
}

const YouTube = ( () => {
	const youTubeEndpoint = 'https://www.googleapis.com/youtube/v3/search';
	
	const youTubeAPICall = (query, token, callback) => {	
		const  ytQuery = {
	    	part: 'snippet',
		    key: 'AIzaSyARINuQ0brfcXy9w1pZ5UGit5GHySfvggc',
		    type: 'video',
		    maxResults: '6',
		    pageToken: token,
		    videoEmbeddable: true,
		    safeSearch: 'moderate',
		    q: query
		} 	
		$.getJSON(youTubeEndpoint, ytQuery, callback);
	}

	const displayData = (data) => {
    	let html = '';
    	data.items.forEach( (element, index) => {
    		if(element.id.videoId) {
    			const snippet = element.snippet;
    			// QUESTION: is using id like this a good idea? (puts the Youtube video ID in the html to be retreived by javascript, i.e. storing data in the DOM)
    			html += `<div class="ytvid ytvid-embed red" id="${element.id.videoId}"><img src="${snippet.thumbnails.default.url}" alt="${snippet.title}"></div>`;
    		}
    	});

    	// HTML
    	$('.ytvids').html(html);

    	// Event handlers
    	$('.ytvids').on('click','.ytvid', (event) => {
    		console.log(event);
    		let html = `<iframe src="https://www.youtube.com/embed/${$(event.target).closest('.ytvid').attr('id')}?autoplay=1" class="youtube-video"></iframe>`;
    		openModal(html);
    	});
    	
    	// Pagination
    	$('#yt-prev').off('click');
    	$('#yt-next').off('click');

    	if(data.prevPageToken) {
			$('#yt-prev').on('click', (event) => {
	    		event.preventDefault();
	    		console.log(data.prevPageToken);
	    		$('#yt-prev').off('click');
	    		youTubeAPICall(state.searchStrings.slice(-1)[0], data.prevPageToken, displayData);
	    	});
    	}
    	else {
    		$('#yt-prev').off('click');
    		// Probably want to dim that arrow
    	}

    	if(data.nextPageToken) {
			$('#yt-next').on('click', (event) => {
	    		event.preventDefault();
	    		console.log(data.nextPageToken);
	    		$('#yt-next').off('click');
	    		youTubeAPICall(state.searchStrings.slice(-1)[0], data.nextPageToken, displayData);
	    	});
    	}
    	else {
    		$('#yt-next').off('click');
    		// Probably want to dim that arrow
    	}
	}

	return {
		queryYouTube: (query, token) => {
			state.searchStrings.push(query);
			youTubeAPICall(query, token, displayData);
		}
	};
})();


// These chain calls might make Promises appealing, but they really depend on the chain executing in order,
// so this might be simpler?
const queryAnilist = (query) => {
	const anilistEndPoint = 'https://anilist.co/api/';
	const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
	const anilistCharSearch = anilistEndPoint + 'character/search/';
	const anilistCharPage = anilistEndPoint + '';
	// Send POST to anilist API for client credentials token
	// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
	// These tokens expire after 1 hour, ideally I would store the token and re-use it until it expires, but
	// time constraints force me to simply fetch a new one with each search for now
	$.post(anilistAuthTokenPost, (data) => {
		window.anilistAccessToken = data.access_token;
		const anilistAccessToken = '?access_token=' + data.access_token;
		// GET with token
		console.log(anilistCharSearch + query + anilistAccessToken);
		$.get(anilistCharSearch + query + anilistAccessToken, (data) => {
			const characterID = data[0].id; // assuming for now first result is the best one

			// GET full page data with ID
			$.get(anilistEndPoint + 'character/' + characterID + '/page' + anilistAccessToken, (data) => {
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

const queryImgurGallery = (query) => {	
  const settings = {
    'async': true,
    'crossDomain': true,
    'url': 'https://api.imgur.com/3/gallery/search/top/?q=' + query,
    'method': 'GET',
    'headers': {
      'authorization': 'Client-ID 78110c84cc38ed3'
    }
  }

  $.ajax(settings).done((response) => { 
  	console.log('imgur',response);
    let results = [];
    let albumPromises = [];
    
    response.data.forEach((i) => {
      if(i.is_album) {
        albumPromises.push(queryImgurAlbum(i.id));
      }
      else {
        results.push( {
        	'link': i.link,
    		'alt': i.description | i.title,
    		'page': `imgur.com/${i.id}`
    	});
      }
    });
    
    if(albumPromises.length>0) {
      Promise.all(albumPromises).then( aLinks => {
        aLinks.forEach( a => {
          results.push.apply(results, getImgurAlbumLinks(a.data));
        });
        renderImgurData(results);
      }).catch( error => { alert(error); });
    }
    else {
      renderImgurData(results);
    }
  });	
}

const queryImgurAlbum = (id) => {
	const settings = {
	    'async': true,
	    'crossDomain': true,
	    'url': 'https://api.imgur.com/3/album/' + id + '/images',
	    'method': 'GET',
	    'headers': {
	      'authorization': 'Client-ID 78110c84cc38ed3'
	    }
  	}
  	return $.ajax(settings); // returns a Promise object
}

const getImgurAlbumLinks = (album) => {
  let links = [];
  album.forEach((l) => {
    links.push( { 
    	'link': l.link,
    	'alt': l.title
    });
  });
  return links;
}

const renderAnilistCharacterData = (data) => {
	$('.portrait-image').html('<img src="' + data.image_url_lge + '">');
	$('.char-name').html(data.name_first);
	if(data.name_last !== 'null') $('.char-name').append(' ' + data.name_last);
	$('.jpn-char-name').html(data.name_japanese);
	$('.alt-char-name').html(data.name_alt);
	// anilist has ~! and !~ markdowns to hide spoilers, have to filter that out
	// Stretch goal: show excluded text when hovered over (as anilist does)
	// Issue: some of these descriptions can be rather long - I might cut them down to a certain length and add an ellipsis
	$('.long-description').html(data.info.replace(/~!.*?!~*/g, '')
		.replace(/[<]br[^>]*[>]/gi,'')) // remove line breaks
		.append(' (Source: <a href="https://anilist.co/character/' + data.id + '/" target="_blank">anilist.co</a>)');
	
	$('.appears-in').empty();
	data.anime.forEach((anime) => {
		$('.appears-in').append('<li><a href="http://anilist.co/anime/' + anime.id + '" target="_blank">' + anime.title_english + '</a></li>');
	});
				
}

const renderImgurData = (data) => {
	// 0-index for simplicity
	window.imgurPage = 0;
	const index = window.imgurPage*6;
	let html = '';
	for(let i=index;i<index+6; i++) {
		if(i>=data.length) break;
		html += '<div class="imgurpic red"><img src="' + imgurURL(data[i].link,'b') + '" alt="' + data[i].title + '"></div>';
	}
	$('.imgurpics').html(html);
}

const imgurURL = (imgURL, size) => imgURL.replace(/\.(?=[^.]*$)/, (size || '') + '.');

const searchModal => {
	let html = '<div class="search-box red"><input type="text" name="search" placeholder="Type a character name"> <i class="fa fa-search" aria-hidden="true"></i></div>';
	html+= '<div class="col-3 blue">p</div><div class="col-3 blue">p</div><div class="col-3 blue">p</div><div class="col-3 blue">p</div>';
	openModal(html);
}

const openModal = (content) => {
	$('.modal-content').html(content);
	$('.overlay').addClass('dim');
	$('#lightbox').removeClass('hidden');
}

const closeModal => {
	$('.modal-content').empty();
	$('.overlay').removeClass('dim');
	$('#lightbox').addClass('hidden');
}

$(document).ready(function() {
	//searchModal();
	const query = 'shinobu oshino';
	queryAnilist(query);
	queryImgurGallery(query);
	YouTube.queryYouTube(query);
});