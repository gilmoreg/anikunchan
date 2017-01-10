'use strict';
/*
	Working notes:

	Anilist character search is pretty finicky and doesn't return some expected results, but there really isn't a better source

	Certain searches, especially for characters with no last names, don't make for good Imgur or Youtube searches

*/
let state = {
	searchStrings: [],
	anilistAccessToken: '',
	imgurPage: 0
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

const Anilist = ( () => {
	const anilistEndPoint = 'https://anilist.co/api/';
	let anilistAccessToken = state.anilistAccessToken;

	const getAnilistToken = () => {
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
			resolve( $.get(`${anilistEndPoint}character/search/${query}${anilistAccessToken}`) );
		});
	}

	const anilistCharPage = (id) => {
		return new Promise( (resolve,reject) => {
			resolve( $.get(`${anilistEndPoint}character/${id}/page${anilistAccessToken}`) );
		});
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

	return {
		queryAnilist: (query) => {
			getAnilistToken().then( (data) => {
				anilistAccessToken = '?access_token=' + data.access_token;
				anilistCharSearch(query).then( (data) => { 
					anilistCharPage(data[0].id).then( (data) => {
						renderAnilistCharacterData(data);
					});
				});
			})
			.catch( (msg) => { console.log('err queryAnilist',msg); });
		}
	}
})();

const Imgur = ( () => {
	
	let imgurPage = state.imgurPage;
	let imgurData = [];

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

		imgurData = [];
		let albumPromises = [];

		response.data.forEach((i) => {
		  if(i.is_album) {
		    albumPromises.push(queryImgurAlbum(i.id));
		  }
		  else {
		    imgurData.push( {
		    	'link': i.link,
				'alt': i.description | i.title,
				'page': `imgur.com/${i.id}`
			});
		  }
		});

		if(albumPromises.length>0) {
		  Promise.all(albumPromises).then( aLinks => {
		    aLinks.forEach( a => {
		      imgurData.push.apply(imgurData, getImgurAlbumLinks(a.data));
		    });
		    renderImgurData();
		  }).catch( error => { alert(error); });
		}
		else {
		  renderImgurData();
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
	    	'alt': l.title,
	    	'page': `imgur.com/${album.id}`
	    });
	  });
	  return links;
	}

	const renderImgurData = () => {
		const index = imgurPage*6;
		let html = '';
		for(let i=index;i<index+6; i++) {
			if(i>=imgurData.length) break;
			//html += '<div class="imgurpic red"><img src="' + imgurURL(data[i].link,'b') + '" alt="' + data[i].title + '"></div>';
			// imgurData is [ {link, alt, page } ] 
			html += `<div class="imgurpic red"><img src="${imgurURL(imgurData[i].link,'b')}" id="imgur-${i}" alt="${imgurData[i].title}"></div>'`;
		}

		// HTML
		$('.imgurpics').html(html);

		// Event handlers
		$('.imgurpics').on('click','.imgurpic', (event) => {
    		event.preventDefault();
    		console.log(event);
    		let index = $(event.target).attr('id').match(/[^-]*$/);
    		console.log(index);
    		let html = `<a href="https://${imgurData[index].page}" target="_blank"><img src="${imgurData[index].link}" class="imgur-pic"></a>`;
    		openModal(html);
    	});

    	// Pagination
    	$('#imgur-prev').off('click');
    	$('#imgur-next').off('click');

    	if(imgurPage>0) {
    		$('#imgur-prev').on('click', (event) => {
	    		event.preventDefault();
	    		$('#imgur-prev').off('click');
	    		imgurPage--;
	    		renderImgurData();
	    	});
    	}
    	else {
    		// dim that arrow
    	}

    	if( (imgurPage*6) < imgurData.length ) {
    		$('#imgur-next').on('click', (event) => {
	    		event.preventDefault();
	    		$('#imgur-next').off('click');
	    		imgurPage++;
	    		renderImgurData();
	    	});
    	}
    	else {
    		// dim that arrow
    	}
	}

	const imgurURL = (imgURL, size) => imgURL.replace(/\.(?=[^.]*$)/, (size || '') + '.');

	return {
		queryImgur: (query) => {
			queryImgurGallery(query);
		}
	}

})();

const searchModal = () => {
	let html = '<div class="search-box red"><input type="text" name="search" placeholder="Type a character name"> <i class="fa fa-search" aria-hidden="true"></i></div>';
	html+= '<div class="col-3 blue">p</div><div class="col-3 blue">p</div><div class="col-3 blue">p</div><div class="col-3 blue">p</div>';
	openModal(html);
}

const openModal = (content) => {
	$('.modal-content').html(content);
	$('.overlay').addClass('dim');
	$('#lightbox').removeClass('hidden');
}

const closeModal = () => {
	$('.modal-content').empty();
	$('.overlay').removeClass('dim');
	$('#lightbox').addClass('hidden');
}

$(document).ready(function() {
	//searchModal();
	const query = 'shinobu oshino';
	Anilist.queryAnilist(query);
	Imgur.queryImgur(query);
	YouTube.queryYouTube(query);
});