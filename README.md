# anikunchan

A Thinkful Front End Web Development Capstone Project
by [Grayson Gilmore](https://github.com/gilmoreg/).

/* screenshot */

<h1>Summary</h1>
<p>Anikunchan enables you to search for your favorite anime characters and then see whatever data is available about them, namely:</p>
<ul>
	<li>A portrait</li>
	<li>The character's name, Japanese name and alternate names</li>
	<li>Which anime that character appears in</li>
	<li>Links which provide additional resources</li>
	<li>A summary</li>
	<li>The results of a Google Image search, with the ability to page through additional results</li>
	<li>A similar display of a YouTube search</li>
</ul>
<p>Particular elements will be hidden if no results are available. Search results are sorted by relevance, and may be redisplayed once hidden.</p>

<h2>Technical</h2>
<p>This site is entirely browser-side, written in ES6 Javascript using JQuery. Additionaly, the site uses [Marked](https://github.com/chjj/marked) to render Markdown in the summary section and [Font Awesome](http://fontawesome.io/) for pagination arrows.</p>
<p>The main datasource is the [Anilist.co API](https://anilist-api.readthedocs.io/en/latest/). The Javascript fetches an [access token](https://anilist-api.readthedocs.io/en/latest/authentication.html#grant-client-credentials) (good for one hour) and then does a recursive search to get every page of results. It then displays these results to the user, who chooses one. The code then queries the Anilist API for more specific information about that character, sorts the list of anime by air date, and then queries Google Images (via the [Custom Search Engine API](https://developers.google.com/custom-search/)) and [YouTube](https://developers.google.com/youtube/v3/) to display more content for the user.</p>


