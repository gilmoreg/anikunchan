# anikunchan

A Thinkful Front End Web Development Capstone Project
by [Grayson Gilmore](https://github.com/gilmoreg/).

##screenshot

##Summary
Anikunchan enables you to search for your favorite anime characters and then see interesting data about them:

* A portrait
* The character's name, Japanese name and alternate names
* Which anime that character appears in
* Links which provide additional resources
* A summary
* The results of a Google Image search, with the ability to page through additional results
* A similar display of a YouTube search

Particular elements will be hidden if no data are available. Search results are sorted by relevance, and may be redisplayed once hidden.

##Technical
* This site is entirely browser-side, written in HTML, ES6 Javascript, CSS3, and JQuery. 
* Additionally, the site uses:
  * [Marked](https://github.com/chjj/marked) to render Markdown in the summary section
  * [Font Awesome](http://fontawesome.io/)
  * [Bluebird](http://bluebirdjs.com/) to polyfill Promises
  * [Slick](http://kenwheeler.github.io/slick/) for the carousel
  * [Featherlight](https://github.com/noelboss/featherlight/) for the lightbox
* The main datasource is the [Anilist.co API](https://anilist-api.readthedocs.io/en/latest/). 
  * The Javascript fetches an [access token](https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials) (good for one hour) and then does a recursive search using Promises to get every page of results.
  * The results are sorted by relevance according to the [Strike A Match](http://www.catalysoft.com/articles/StrikeAMatch.html) algorithm.
  * It then displays these results to the user, who chooses one. The code then queries the Anilist API for more specific information about that character, including alternate names, summary text in Markdown, and a list of anime the character appears in.
  * The list of anime is sorted by air date, and all of this data (where available) is shown to the user.
* Further content is obtained from Google Images (via the [Custom Search Engine API](https://developers.google.com/custom-search/)) and [YouTube](https://developers.google.com/youtube/v3/) and displayed. The user can paginate these results.
* The site is responsive and will stack elements on a smaller screen.

## Known Issues
* Due to limitations with Featherlight, Youtube videos are not fully responsive when played; their size is fixed by the width of the window when the search was performed.


