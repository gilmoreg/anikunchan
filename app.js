'use strict';
/*
*/
const GoogleImages = ( () => {
	const maxCalls = 2; // managing this finite resource; no matter what results, max of 10 calls per query
	const container = $('.google-image-slick');
	let cache = [];

	const googleAPICall = (endpoint, gQuery, item) => {
		return new Promise( (resolve, reject) => {
			item.numAPICalls++;
			$.getJSON(endpoint, gQuery)
			.done( (data) => {
				resolve(data);
			})
			.fail( (msg) => {
				reject(msg);
			});
		});
	};

	const googleSearch = (cacheItem, returnType, gQuery, endpoint) => {
		if(cacheItem.numAPICalls > maxCalls) { 
			return new Promise( (resolve, reject) => {
				reject('maxcalls exceeded');
			});
		}
		return new Promise( (resolve, reject) => {
			googleAPICall(endpoint, gQuery, cacheItem).then( (data) => {
				if(data.items) {
					cacheItem.results = cacheItem.results.concat(data.items);
					if(returnType === 'cache') resolve(cacheItem);
					else resolve(data);
				}
				else {
					reject(data);
				}
			})
			.catch( (msg) => {
				reject(msg);
			});
		});
	};

	const getCacheItem = (q, cache) => {
		// This might not be a beautiful place to put this but it makes sense codeflow-wise (for now)
		// Filter out expired results
		if(cache) {
			cache = cache.filter( (a) => {
				if(a.expires < Date.now()) return false;
				return true;
			});

			for(let i=0;i<cache.length;i++) {
				if(cache[i].query === q) {
					return cache[i];
				}
			}
		}
		return undefined;
	};

	const gslick = (item, element) => {
		if(container.hasClass('slick-initialized')) container.slick('unslick');

    	let html = '';
    	item.results.forEach( (e) => {
			html+= buildImageHTML(e);
		});
		container.html(html);

		container.not('.slick-initialized').slick({
			slidesToShow: 4,
			slidesToScroll: 4,
			dots: true,
			infinite: false,
			responsive: [
				{
					breakpoint: 1024,
					settings: {
						slidesToShow: 3,
						slidesToScroll: 3,
						dots: true
					}
				},
				{
					breakpoint: 600,
					settings: {
						slidesToShow: 2,
						slidesToScroll: 2,
						dots: false
					}
			 	}
			]
		});
	};

	// returnType is 'cache' to return the whole cacheItem, any other value returns only the results from the query
	const imageSearch = (cacheItem, returnType) => {
		const gQuery = {
			q: cacheItem.query,
			key: 'AIzaSyCTYqRMF86WZ_W4MRPrha8SfozzzbdsIvc',
			cx: '017818390200612997677:nulntbij5kc',
			searchType: 'image',
			num: 10, // Upper limit in Google CSE
			safe: 'medium',
			start: cacheItem.numAPICalls*10+1
		}
		// Probably not this simple? idk TODO
		return googleSearch(cacheItem, returnType, gQuery, 'https://www.googleapis.com/customsearch/v1');
	};

	const buildImageHTML = (e) => {
		return `<div class="gimage" link="${e.link}" contextLink="${e.image.contextLink}">` + 
					`<a href="${e.link}" data-featherlight="image">` + 
						`<img src="${e.image.thumbnailLink}" onerror="imgError(this)" alt="${e.snippet}">` + 
					`</a>` + 
				`</div>`;
	};

	const display = (item) => {
		console.log('display (image)',item);

		if(item===undefined || item.results.length===0) {
			container.addClass('hidden');
			return;
		}
		container.removeClass('hidden');
		// item, element, build, search
    	gslick(item,container,buildImageHTML);

		// On before slide change
		container.on('beforeChange', function(event) {
			// Attempt to fetch more results, then add them to the slick
			// this will cache the items; if the user selects this character again they will load when slick inits
			imageSearch(item, '').then( (data) => {
				let items = data.items || data.results;
				if(items) {
					items.forEach( (e) => {
						if(e.image) {
							container.slick('slickAdd', buildImageHTML(e));
						}
					});
				}			
			})
			.catch( (msg) => {
				if(msg!=='maxcalls exceeded') console.log('slickevent reject',msg);
			});
		});
	};
	// Entry point - the first Google search for a new character result
	return {
		query: (q) => {
			// If we have this item cached, return that
			console.log('query',cache);
			let item = getCacheItem(q, cache); 
			if(item) {
				display(item);
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
				imageSearch(item, 'cache').then( (i) => {
					display(i);
				}), (msg) => { console.log('nocache reject',msg); };
			}
		}
	}
})();

const YouTube = ( () => {
	const maxCalls = 2;
	const container = $('.youtube-video-slick');
	let cache = [];

	const googleAPICall = (endpoint, gQuery, item) => {
		return new Promise( (resolve, reject) => {
			item.numAPICalls++;
			$.getJSON(endpoint, gQuery)
			.done( (data) => {
				resolve(data);
			})
			.fail( (msg) => {
				reject(msg);
			});
		});
	};

	const googleSearch = (cacheItem, returnType, gQuery, endpoint) => {
		if(cacheItem.numAPICalls > maxCalls) { 
			return new Promise( (resolve, reject) => {
				reject('maxcalls exceeded');
			});
		}
		return new Promise( (resolve, reject) => {
			googleAPICall(endpoint, gQuery, cacheItem).then( (data) => {
				if(data.items) {
					cacheItem.results = cacheItem.results.concat(data.items);
					cacheItem.token = data.nextPageToken;
					if(returnType === 'cache') resolve(cacheItem);
					else resolve(data);
				}
				else {
					reject(data);
				}
			})
			.catch( (msg) => {
				reject(msg);
			});
		});
	};

	const getCacheItem = (q, cache) => {
		// This might not be a beautiful place to put this but it makes sense codeflow-wise (for now)
		// Filter out expired results
		if(cache) {
			cache = cache.filter( (a) => {
				if(a.expires < Date.now()) return false;
				return true;
			});

			for(let i=0;i<cache.length;i++) {
				if(cache[i].query === q) {
					return cache[i];
				}
			}
		}
		return undefined;
	};

	// returnType is 'cache' to return the whole cacheItem, any other value returns only the results from the query
	const videoSearch = (cacheItem, returnType) => {
		const  ytQuery = {
	    	part: 'snippet',
		    key: 'AIzaSyCTYqRMF86WZ_W4MRPrha8SfozzzbdsIvc',
		    type: 'video',
		    maxResults: '10',
		    videoEmbeddable: true,
		    safeSearch: 'moderate',
		    q: cacheItem.query
		}
		if(cacheItem.token!=='') ytQuery.pageToken = cacheItem.token; // TODO this might not be adding the right one? might have to track one for the whole object?
		// Probably not this simple? idk TODO
		return googleSearch(cacheItem, returnType, ytQuery, 'https://www.googleapis.com/youtube/v3/search');
	};

	const buildVideoHTML = (e) => {
		const snippet = e.snippet;
		let title = snippet.title;
		if(title.length > 50) title = title.substring(0,50) + '...';
		const iframeOptions = `data-featherlight="iframe" data-featherlight-iframe-width="${$(window).width()*0.8}" data-featherlight-iframe-height="${$(window).height()*0.5}"` + 
			`data-featherlight-iframe-max-width="640px" data-featherlight-iframe-max-height="640px"`;
		return `<div class="ytvid" id="${e.id.videoId}">` + 
					`<div class="yt-thumb">`+ 
						`<a href="https://www.youtube.com/embed/${e.id.videoId}?autoplay=1" ${iframeOptions}>`+
						`<img src="${snippet.thumbnails.default.url}" alt="${title}"></a>` + 
					`</div>` + 
					`<div class="yt-desc">${title}</div>`+ 
				`</div>`;
	};

	const gslick = (item) => {
		if(container.hasClass('slick-initialized')) container.slick('unslick');

    	let html = '';
    	item.results.forEach( (e) => {
			html+= buildVideoHTML(e);
		});
		container.html(html);

		container.not('.slick-initialized').slick({
			slidesToShow: 4,
			slidesToScroll: 4,
			dots: true,
			infinite: false,
			responsive: [
				{
					breakpoint: 1024,
					settings: {
						slidesToShow: 3,
						slidesToScroll: 3,
						dots: true
					}
				},
				{
					breakpoint: 600,
					settings: {
						slidesToShow: 2,
						slidesToScroll: 2,
						dots: false
					}
			 	}
			]
		});
	};

	const display = (item) => {
		if(item===undefined || item.results.length===0) {
			container.addClass('hidden');
			return;
		}
		container.removeClass('hidden');

    	gslick(item);

    	// On before slide change
		container.on('beforeChange', function(event) {
			// Attempt to fetch more results, then add them to the slick
			// this will cache the items; if the user selects this character again they will load when slick inits
			videoSearch(item, '').then( (data) => {
				let items = data.results || data.items;
				console.log('slickadding yt',data);
				if(items) {
					items.forEach( (e) => {
						if(e.id.videoId) {
							console.log('slickadding yt',e);
							container.slick('slickAdd', buildVideoHTML(e));
						}
					});
				}			
			})
			.catch( (msg) => {
				if(msg!=='maxcalls exceeded') console.log('slickevent reject',msg);
			});
		});	
	}

	return {
		query: (q, token) => {
			// If we have this item cached, return that
			console.log('query',cache);
			let item = getCacheItem(q, cache); 
			if(item) {
				display(item);
			}
			else {
				// No cached result - call API from scratch
				item = {
					query: q,
					expire: Date.now()+1.08e7, // 3 hours in milliseconds
					numAPICalls: 0,
					token: '',
					results: []
				};
				cache.push(item);
				videoSearch(item, 'cache').then( (i) => {
					display(i);
				}), (msg) => { console.log('nocache reject',msg); };
			}
		}
	};
})();

const Anilist = ( () => {
	const anilistEndPoint = 'https://anilist.co/api/';
	let anilistAccessToken = {};
	let anilistPage = 1;

	const getAnilistToken = () => {
		// Send POST to anilist API for client credentials token
		// https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials
		// These tokens expire after 1 hour - giving myself 20 seconds leeway
		return new Promise( (resolve, reject) => {
			if((Date.now()/1000) < (anilistAccessToken.expires-20)) resolve(); 
			const anilistAuthTokenPost = anilistEndPoint + 'auth/access_token?grant_type=client_credentials&client_id=solitethos-acaip&client_secret=gBg2dYIxJ3FOVuYPOGgHPGKHZ';
			$.post(anilistAuthTokenPost)
			.done( (data) => {
				resolve(data);
			})
			.fail( (msg) => {
				reject(msg);
			});
		});
	}

	const anilistCharSearch = (query) => {
		return new Promise( (resolve,reject) => {
			$.get(`${anilistEndPoint}character/search/${query}?page=${anilistPage}&access_token=${anilistAccessToken.access_token}`)
			.done( (data) => {
				resolve(data);
			})
			.fail( (msg) => {
				reject(msg);
			});
		});
	}

	const recursiveSearch = (query, set, callback) => {
		anilistCharSearch(query).then( (data) => { 
			if(data === undefined || data.error) {
				callback();
				return;
				// TODO Need to stop the spinner
			}
			data = data.filter( (i) => {
				if(i.name_first) return true;
				return false;
			});
			set = set.concat(data);
			if(data.length>=20) {
				anilistPage++;
				recursiveSearch(query, set, callback);
			}
			else {
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
			if(query.length<2) {
				alert('Please enter at least 2 characters.');
				return;
			}
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
			// Stretch goal: show only the first few lines until the user clicks "More"
			description	+= `(Source: <a href="https://anilist.co/character/${data.id}/" target="_blank">anilist.co</a>)`
			if(description.length>100) {
				$('.long-description').html(description);
				$('.summary').removeClass('hidden');
			}
			else {
				$('.summary').addClass('hidden');	
			}

			$('.appears-in-list').empty();			
			if(data.anime.length>0) {
				// Sorting anime by start date helps reduce bad Google results (due to OVA/ONAs and shorts sometimes coming first)
				data.anime.sort( (a,b) => {
					return a.start_date_fuzzy - b.start_date_fuzzy;
				});

				data.anime.forEach((anime) => {
					$('.appears-in-list').append(`<li><a href="https://anilist.co/anime/${anime.id}" target="_blank">${animeTitle(anime)}</a></li>`);
				});
				$('.appears-in').removeClass('hidden');
			}
			else {
				$('.appears-in').addClass('hidden');	
			}
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
		if(typeof str1 !== 'string' || typeof str2 !== 'string') {
			return 0;
		}
		let pairs1 = wordLetterPairs(str1.toUpperCase());
		let pairs2 = wordLetterPairs(str2.toUpperCase());
		let intersection = 0;
		let	union = pairs1.length + pairs2.length;
		
		pairs1.forEach( (p1) => {
			pairs2 = pairs2.filter( (p2) => {
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
		if(data===undefined || data.error) {
			$('.al-search-results').html("No results");
			hideSpinner();
			return;
		}
		hideSpinner();
		showResults();
		let html = '';

		const query = $('#al-query').val().trim();

		data = data.filter( (a) => {
			if(a.name_first) return true;
			else return false;
		});

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
		return (
			`<div class="col-3 aniCharSearch" id="${element.id}" title="${name}">` +
				`<div class="ani-search-thumb">` +
					`<img src="${element.image_url_med}" onerror="imgError(this)" alt="${name}">` +
				`</div>` +
				`<div class="ani-search-name">${name}</div>` +
			`</div>`
		);
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

	return {
		createPage: (data) => {
			Anilist.render(data);
			const query = Anilist.getName(data) + ' ' + Anilist.getAnime(data);
			YouTube.query(query);
			GoogleImages.query(query);
			setLinks(query);
			$('.app').removeClass('hidden');
		}
	}
})();	

const search = () => {
	showResults();
	showSpinner();
	Search.performSearch();
	$('#al-query').blur();
}

const toggleResults = () => {
	$('.fa-chevron-down').toggleClass('js-chevron-down-openstate js-chevron-down-closestate');
	$('.search').stop().slideToggle();
}

const showResults = () => {
	$('.fa-chevron-down').removeClass('js-chevron-down-closestate');
	$('.search').stop().show();
}

const showSpinner = () => {
	$('.search-button').html('<div class="spinner"></div>');
}

const hideSpinner = () => {
	$('.search-button').html('<i class="fa fa-search" aria-hidden="true"></i>');
}

const imgError = (image) => {
    image.onerror = "";
    image.src='https://cdn.anilist.co/img/dir/character/med/default.jpg';
    return true;
}

$(document).ready(function() {
	$.featherlight.defaults.closeOnClick = 'anywhere';
	$('#al-query').focus();
});