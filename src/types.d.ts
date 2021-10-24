interface Config {
	botToken: string,
	db: {
		user: string,
		password: string,
		url: string,
		name: string,
		isAtlas: boolean,
	},
	refreshIntervall: number
}

type SlashCommandBuilder = import("@discordjs/builders").SlashCommandBuilder;
type MessageButton = import("discord.js").MessageButton;
interface BotInteraction {
	data?: SlashCommandBuilder,
	button?: MessageButton,
	execute: Function,
	defaultPermission: boolean,
	type: "BUTTON" | "COMMAND"
}

interface SubscriptionInfo {
	subreddit: string,
	guilds: GuildSubscription[]
}

interface GuildSubscription {
	guild: string,
	channel: string
}


interface RedditResponse {
	kind: "listing",
	data: Listing
}

interface Listing {
	after: string,
	dist: number,
	modhash: string,
	geo_filter: string,
	children: Post[],
	before: string,
}

interface Post {
	kind: "t3",
	data: PostData
}

interface PostData {
	subreddit: string,
	selftext: string,
	title: string,
	link_flair_richtext: FlairRichtext[],
	link_flair_text: string,
	link_flair_background_color?: string,
	spoiler: boolean,
	removed: boolean,
	over_18: boolean,
	spam: boolean,
	approved: boolean,
	author: string,
	url: string,
	created_utc: number,
	id: string,
	thumbnail?: string,
	permalink: string,
}

interface FlairRichtext {
	a: string,
	e: "emoji" | "text",
	t: string,
	u: string
}


interface RedditUser {
	kind: "t2",
	data: RedditUserData
}

interface RedditUserData {
	icon_img: string
}

interface SubredditInfo {
	kind: "t5",
	data: SubredditData
}

interface SubredditData {
	community_icon: string
}