var blackList = []
var n = 0

// Send to Telegram
const sendTwitter = (ctx, twitter, edit) => {
	var id = twitter.id_str
	var styles = ctx.styles

	var output = ''
	var replyMarkup = {}

	//USER
	var user = twitter.user.screen_name || twitter.user.name
	var user_link = {
		without: '',
		tg: `<b>User</b>: https://twitter.com/${user}\n`,
		link: `<b>User</b>: <a href="https://twitter.com/${user}">@${user}</a>\n`,
		tg_link: `<b>User</b>: @${user} (<a href="https://twitter.com/${user}">@${user}</a>)\n`,
		link_tg: `<b>User</b>: <a href="https://twitter.com/${user}">@${user}</a> (@${user})\n`
	}
	output += user_link[styles.user] || ''

	//TEXT
	var text = {
		without: '',
		default: `<b>Text</b>: ${twitter.text}\n`,
		short19: `<b>Text</b>: ${twitter.text.substr(0, 19)}...\n`,
		short52: `<b>Text</b>: ${twitter.text.substr(0, 52)}...\n`
	}
	output += text[styles.text] || ''
	
	const isUrgent = () =>
		twitter.text.toLowerCase().includes('corrr') ||
		twitter.text.toLowerCase().includes('corre') ||
		twitter.text.toLowerCase().includes('š') ||
		twitter.text.toLowerCase().includes('šØ') ||
		twitter.text.toLowerCase().includes('bug')

	if (isUrgent()) {
		output += `\nšāāļøšāāļøšāāļø<b>URGENT</b>šØšØšØ\n\n`
	}

	//URL
	var url = {
		without: '',
		default: `<b>URL</b>: <a href="https://twitter.com/${user}/status/${id}">Go To Twitter</a>`,
		full: `<b>URL</b>: https://twitter.com/${user}/status/${id}`,
	}
	output += url[styles.url] || ''

	//KEYBOARD
	var favoritesStatus = 'ā¤'
	var favoritesCbStatus = 'love'
	if (twitter.favorited) {
		favoritesStatus = 'š'
		favoritesCbStatus = 'unlove'
	}

	var retweetStatus = 'š'
	var retweetCbStatus = 'rt'
	if (twitter.retweeted) {
		retweetCbStatus = 'unrt'
		retweetStatus = 'ā'
	}

	var commentStatus = 'š¬'

	if (styles.keyboard) {
		if (styles.keyboard == 'count') {
			favoritesStatus += ` ${twitter.favorite_count}`
			retweetStatus += ` ${twitter.retweet_count}`
		} else if (styles.keyboard == 'name') {
			favoritesStatus += ' Love'
			retweetStatus += ' RT'
			commentStatus += ' Comment'
		}

		replyMarkup = {
			inline_keyboard: [[
				{text: favoritesStatus, callback_data: `${favoritesCbStatus}:${id}`},
				{text: retweetStatus, callback_data: `${retweetCbStatus}:${id}`},
				{text: commentStatus, url: `https://twitter.com/${user}/status/${id}`}
			]]
		}
	}

	if (edit) {
		return ctx.editMessageText(output, {
			parse_mode: 'HTML',
			disable_web_page_preview: styles.noPreviewLink || false,
			reply_markup: replyMarkup
		})
	}

	return ctx.bot.telegram.sendMessage(ctx.chat_id, output, {
		parse_mode: 'HTML',
		disable_web_page_preview: styles.noPreviewLink || false,
		reply_markup: replyMarkup
	})
}

const getTwitter = (ctx) => {
	ctx.client.get('statuses/show/', {id: ctx.id}, (error, data, response) => {
		if (error) {
			ctx.logError(error)
		} else {
			return sendTwitter(ctx, data, true)
		}
	})
}

const getTimeLine = async (ctx, notSend) => {
	ctx.log(`Get new tweets: ${new Date()}`)
	await ctx.client.get('statuses/home_timeline', {}, async (error, tweets, response) => {
		if (error) {
			ctx.logError(error)
		} else {
			for (var post of tweets) {
				const user = post.user.screen_name || post.user.name
				if (!blackList.includes(post.id) && !notSend.includes(user)) {
					n++
					await sendTwitter(ctx, post)
				}
				blackList.push(post.id)
			}
		}
	})
	if (blackList.length >= 1000) {
		blackList = blackList.splice(500, blackList.length)
	}
	ctx.log(`Tweets processed: ${n}`)
	return n, blackList
}

const getSearch = async (ctx) => {
	ctx.log(`Get new tweets: ${new Date()}`)
	ctx.log(`match: ${ctx.match[1]}`)
	console.log(ctx.match[1])
	await ctx.client.get('search/tweets', {q: ctx.match[1]}, async (error, tweets, response) => {
		if (error) {
			ctx.logError(error)
		} else {
			if (tweets.statuses.length == 0) {
				return ctx.replyWithMarkdown('*No results*!')
			}
			for (var post of tweets.statuses) {
				n++
				await sendTwitter(ctx, post)
			}
		}
	})
	ctx.log(`Tweets processed: ${n}`)
	return n
}

module.exports = {
	sendTwitter,
	getTwitter,
	getTimeLine,
	getSearch
}
