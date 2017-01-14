'use strict';
/*
*/
let state = {
	searchStrings: [],
	anilistAccessToken: {},
	anilistPage: 1,
}

const Google = ( () => {
	let googlePage = 0;
	let displayPage = 0;
	const googleEndpoint = 'https://www.googleapis.com/customsearch/v1';
	const numToShow = 6;
	const maxResults = 50;
	const maxCalls = 2; // managing this finite resource; no matter what results, max of 10 calls per query

	let cache = [];

	const googleAPICall = (item) => {
		const gQuery = {
			q: item.query,
			key: 'AIzaSyCTYqRMF86WZ_W4MRPrha8SfozzzbdsIvc',
			cx: '017818390200612997677:nulntbij5kc',
			searchType: 'image',
			num: 10, // Upper limit in Google CSE
			safe: 'medium',
			start: item.numAPICalls*10+1
		}
		return Promise.resolve($.getJSON(googleEndpoint, gQuery));
	}

	const getCacheItem = (q) => {
		// This might not be a beautiful place to put this but it makes sense codeflow-wise (for now)
		// Filter out expired results
		cache.filter( (a) => {
			if(a.expires < Date.now()) return false;
			return true;
		});

		for(let i=0;i<cache.length;i++) {
			if(cache[i].query === q) {
				return cache[i];
			}
		}
		return undefined;
	}

	const googleSearch = (cacheItem, callback) => {
		if(cacheItem.numAPICalls > maxCalls) { 
			callback();
			return;
		}
		googleAPICall(cacheItem).then( (data) => {
			if(data.items) {
				cacheItem.results = cacheItem.results.concat(data.items);
				cacheItem.numAPICalls++;
				callback(cacheItem);
			}
			else {
				callback();
			}
		});
	};

	const displayGoogleData = (item) => {
		console.log('displayGoogleData',item);

		if(item===undefined || item.results.length===0) {
			$('.google-image-container').addClass('hidden');
			return;
		}

		$('.google-image-container').removeClass('hidden');

		let html = '';
		// could do this math on the fly, but this is more readable
		// pagination code should make sure that 'start' is never beyond the available results
		// so we don't scroll into an empty div
		const start = displayPage*numToShow; 
		const end = Math.min((start + numToShow),(item.results.length-1));

    	for(let i=start;i<end;i++) {
    		const e = item.results[i];
    		if(e.image) {
    			html += `<div class="gimage" link="${e.link}" contextLink="${e.image.contextLink}"><img src="${e.image.thumbnailLink}" alt="${e.snippet}"></div>`;
    		}
    	}

    	// HTML
    	$('.googleimages').html(html);

    	// Event handlers
    	$('.googleimages').on('click','.gimage', (event) => {
    		const src = $(event.target).closest('.gimage').attr('link');
    		const link = $(event.target).closest('.gimage').attr('contextLink');
    		let html = `<a href="${link}" target="_blank"><img src="${src}" class="google-image"></a>`;
    		CharacterPage.openModal(html);
    	});
 	
    	// Pagination
    	$('#gimages-prev, #gimages-next').off('click').removeClass('dim-arrow');

    	if(displayPage>0) {
			$('#gimages-prev').on('click', (event) => {
	    		event.preventDefault();
	    		$('#gimages-prev').off('click');
	    		displayPage--;
	    		//googleAPICall(data.queries.request[0].searchTerms,displayGoogleData);
	    	});
    	}
    	else {
    		$('#gimages-prev').off('click');
    		$('#gimages-prev').addClass('dim-arrow');
    	}

    	if(end < item.results.length) {
			$('#gimages-next').on('click', (event) => {
	    		event.preventDefault();
	    		$('#gimages-next').off('click');
	    		displayPage++;
	    		//googleAPICall(data.queries.request[0].searchTerms,displayGoogleData);
	    		// assuming a fetch would happen here - but also this cannot actually happen until I am SURE there is enough data
	    	});
    	}
    	else {
    		$('#gimages-next').off('click');
    		$('#gimages-next').addClass('dim-arrow');
    	}
	}

	return {
		// Entry point - the first Google search for a new character result
		query: (q) => {
			displayPage = 0;
			let item = getCacheItem(q);
			if(item) {
				let start = displayPage*numToShow;
				let finish = start + numToShow;
				if(finish > item.results.length && finish < maxResults) {
					googleSearch(item, displayGoogleData).then( (i) => { // resolve
						displayGoogleData(i);
					})
					.catch( (msg) => {
						console.log('more attempt - no results');
					});
				}
				else {
					displayGoogleData(item);
				}
			}
			else {
				// No cached result - call API from scratch
				item = {
					query: q,
					expire: Date.now()+1.08e7, // 3 hours in milliseconds
					numAPICalls: 0,
					results: []
				};
				cache.push(item);
				googleSearch(item, displayGoogleData); // WHY WONT PROMISES WORK HERE? THEY FULFILL BEFORE THE API CALL EVEN HAPPENS
				// Prefetch some more results
				googleSearch(item, $.noop);
			}
		}
		// More public functions
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
		if(data.items.length===0) {
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
    		CharacterPage.openModal(html);
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
	let anilistPage = state.anilistPage;

	const getAnilistToken = () => {
		// Send POST to anilist API for client credentials token
		// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
		// These tokens expire after 1 hour - giving myself 20 seconds leeway
		if((Date.now()/1000) < (anilistAccessToken.expires-20)) return new Promise( (resolve,reject) => { resolve(); } ); 
		const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
		return Promise.resolve( $.post(anilistAuthTokenPost) ); 
	}

	const anilistCharSearch = (query) => {
		return Promise.resolve( $.get(`${anilistEndPoint}character/search/${query}?page=${anilistPage}&access_token=${anilistAccessToken.access_token}`) );
	}

	const recursiveSearch = (query, set, callback) => {
		anilistCharSearch(query).then( (data) => { 
			set = set.concat(data);
			if(data.length>=20) {
				anilistPage++;
				recursiveSearch(query, set, callback);
			}
			else {
				set.filter( (i) => {
					if(data.name_first) return true;
					else return false;
				});
				callback(set);
			}
		}, (err) => { console.log('recursiveSearch err',err); });
	}

	const anilistCharPage = (id) => {
		return Promise.resolve( $.get(`${anilistEndPoint}character/${id}/page?access_token=${anilistAccessToken.access_token}`) );
	}

	const name = (data) => {
		let n = data.name_first;
		if(data.name_last) n += ' ' + data.name_last;
		return n;
	}

	const animeTitle = (data) => {
		if(data.series_type) return data.title_english || data.title_romaji || data.title_japanese || "";
		else if(data.anime[0]) return data.anime[0].title_english || data.anime[0].title_romaji || data.anime[0].title_japanese || "";
		else return "";
	}

	return {
		getCharacterData: (id, callback) => {
			getAnilistToken().then( (data) => {
				if(data) anilistAccessToken = data;
				anilistCharPage(id).then( (data) => {
					callback(data);
				});
			})
			
		},
		characterSearch: (query, callback) => {
			anilistPage = 1;
			getAnilistToken().then( (data) => {
				if(data) anilistAccessToken = data;
				recursiveSearch(query,[],callback);
			}, (msg) => { console.log('err queryAnilist',msg); });
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
			// Stretch goal: show only the first few lines until the user clicks "More"
			description	+= `(Source: <a href="https://anilist.co/character/${data.id}/" target="_blank">anilist.co</a>)`

			$('.long-description').html(description);
			$('.appears-in-list').empty();
			// Sorting anime by start date helps reduce bad Google results (due to OVA/ONAs and shorts sometimes coming first)
			data.anime.sort( (a,b) => {
				return a.start_date_fuzzy - b.start_date_fuzzy;
			});
			data.anime.forEach((anime) => {
				$('.appears-in-list').append(`<li><a href="https://anilist.co/anime/${anime.id}" target="_blank">${animeTitle(anime)}</a></li>`);
			});			
		},
		getName: (data) => {
			return name(data);
		},
		getAnime: (data) => {
			return animeTitle(data);
		}
	}
})();

const Search = ( () => {

	// Relevance search adapted from http://www.catalysoft.com/articles/StrikeAMatch.html
	const letterPairs = (str) => {
	   let pairs = [];
	   for (var i=0; i<(str.length-1); i++) {
		   pairs.push(str.substring(i,i+2));
	   }
	   return pairs;
	}

	const wordLetterPairs = (str) =>  {
	   let allPairs = [];
	   // Tokenize the string and put the tokens/words into an array
	   let words = str.split('\\s');
	   words.forEach( (w) => {
			const pairsInWord = letterPairs(w);
			pairsInWord.forEach( () => {
				allPairs.push(w);
			});
	   })
	   return allPairs;
	}

	const score = (str1, str2) => {
		let pairs1 = wordLetterPairs(str1.toUpperCase());
		let pairs2 = wordLetterPairs(str2.toUpperCase());
		let intersection = 0;
		let	union = pairs1.length + pairs2.length;
		
		pairs1.forEach( (p1) => {
			pairs2.filter( (p2) => {
				if(p1===p2) {
					intersection++;
					return false;
				}
				return true;
			});
		});
		return (2.0*intersection)/union;
	}

	const renderSearch = (data) => {
		if(data.error) {
			$('.al-search-results').html("No results");
			return;
		}
		showResults();
		let html = '';

		const query = $('#al-query').val().trim();

		data.sort( (a,b) => {
			return score(Anilist.getName(b),query) - score(Anilist.getName(a),query);
		});

		data.forEach( (element) => {
			html+=buildSearchResult(element);
		});

		$('.al-search-results').html(html);
		$('.aniCharSearch').on('click', (event) => {
			event.preventDefault();
			toggleResults();
			Anilist.getCharacterData($(event.target).closest('.aniCharSearch').attr('id'), CharacterPage.createPage);
		});
	}

	const buildSearchResult = (element) => {
		let name = element.name_first;
		if(element.name_last) name += ' ' + element.name_last;
		return `<div class="col-3 aniCharSearch" id="${element.id}">` +
				`<div class="ani-search-thumb">` +
					`<img src="${element.image_url_med}" onerror="this.src='https://cdn.anilist.co/img/dir/character/med/default.jpg'" alt="${name}">` +
				`</div>` +
				`<div class="ani-search-name">${name}</div>` +
			`</div>`;
	}

	return {
		search: () => {
			$('.search').removeClass('hidden');
			$('#al-query').focus();
		},
		performSearch: () => {
			const query = $('#al-query').val().trim();
			Anilist.characterSearch(query, renderSearch);
		},

	}
})();

const CharacterPage = ( () => {
	
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

	const closeModal = () => {
		$('.modal-content').empty();
		$('.overlay').removeClass('dim');
		$('#lightbox').addClass('hidden');
		$('.overlay').off('click');
	}

	return {
		createPage: (data) => {
			Anilist.render(data);
			const query = Anilist.getName(data) + ' ' + Anilist.getAnime(data);
			YouTube.queryYouTube(query);
			Google.query(query);
			setLinks(Anilist.getName(data));
			$('.background').removeClass('hidden');
		},
		openModal: (content) => {
			$('.modal-content').html(content);
			$('.overlay').addClass('dim');
			$('#lightbox').removeClass('hidden');
			$('.overlay').on('click', (event) => {
				closeModal();
			});
		},
		closeModal: () => {
			closeModal();
		}
	}
})();	

const search = () => {
	Search.performSearch();
	$('#al-query').blur();
}

const toggleResults = () => {
	// TODO if there are no search results, don't do anything
	$('.fa-chevron-down').toggleClass('js-chevron-down-openstate js-chevron-down-closestate');
	$('.search').stop().slideToggle();
}

const showResults = () => {
	$('.fa-chevron-down').removeClass('js-chevron-down-closestate');
	$('.search').stop().show();
}

const closeModal = () => {
	CharacterPage.closeModal();
}

$(document).ready(function() {
	$('#al-query').focus();
});