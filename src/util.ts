import * as https from "https";
import * as Discord from "discord.js";
import { db } from "./main";


export async function sendRedditRequest(url: string): Promise<any> {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = "";

			res.on("data", d => {
				data += d;
			});
			res.on("end", () => {
				try {
					resolve(JSON.parse(data));
				} catch (error) {
					reject(data);
				}
			});
			res.on("error", (e) => {
				console.error(e);
				reject();
			});
			if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
				console.error("Response returned non-2xx Status code:", res.statusCode, res.statusMessage);
				reject("Response returned non-2xx Status code: " + res.statusCode + " " + res.statusMessage);
			}
		})
	});
}

export function newPostUrl(sub: string): string {
	return "https://www.reddit.com/r/" + sub + "/new.json";
}

export function subredditUrl(sub: string): string {
	return "https://www.reddit.com/r/" + sub + ".json";
}
export function userInfoUrl(user: string): string {
	return "https://www.reddit.com/user/" + user + "/about.json";
}
export function subredditInfoUrl(sub: string): string {
	return "https://www.reddit.com/r/" + sub + "/about.json";
}

export async function checkForNewPosts(sub: string): Promise<Post[]> {
	try {
		let posts: Post[] = (await sendRedditRequest(newPostUrl(sub))).data.children;
		let newPosts: Post[] = [];
		for (let i: number = 0; i < posts.length; i++) {
			let post = posts[i];
			if (await db.wasPostAlreadyPosted(sub, post)) return newPosts;
			newPosts.push(post);
		}
		return newPosts;
	} catch (error) {
		return [];
		//TODO: remove subreddit from subscriptions
	}
}

export async function grabInitialPosts(sub: string) {
	let posts: Post[] = (await sendRedditRequest(newPostUrl(sub))).data.children;
	db.addPostsToDB(sub, posts);
}

export async function getUserInfo(name: string): Promise<RedditUser> {
	return sendRedditRequest(userInfoUrl(name));
}
export async function getSubredditInfo(name: string): Promise<SubredditInfo> {
	return sendRedditRequest(subredditInfoUrl(name));
}

export function fixImageUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;

	let urlObj = new URL(url);
	return urlObj.origin + urlObj.pathname;
}


export async function getUser(name: string, cache: Map<string, RedditUser>): Promise<RedditUser> {
	let cachedResult: RedditUser | undefined = cache.get(name);
	if (cachedResult)
		return cachedResult;

	let newUser = await getUserInfo(name);
	cache.set(name, newUser);
	return newUser;
}
export async function getSubreddit(name: string, cache: Map<string, SubredditInfo>): Promise<SubredditInfo> {
	let cachedResult: SubredditInfo | undefined = cache.get(name);
	if (cachedResult)
		return cachedResult;

	let newSub = await getSubredditInfo(name);
	cache.set(name, newSub);
	return newSub;
}

export function postEmbed(post: Post, user?: RedditUser, subreddit?: SubredditInfo): Discord.MessageEmbed {
	let userImage: string | undefined = fixImageUrl(user?.data.icon_img);
	let subredditImage: string | undefined = fixImageUrl(subreddit?.data.community_icon);
	let flairText: string = "";
	for (let richtext of post.data.link_flair_richtext) {
		if (richtext.e == "text")
			flairText += richtext.t;
	}
	flairText = flairText.trim();
	if (flairText.length > 0) {
		flairText = "[" + flairText + "] "
	}

	let embed = new Discord.MessageEmbed()
		.setTitle(`${flairText}${post.data.title}`.substring(0, 256))
		.setURL(`https://redd.it/${post.data.id}`)
		.setAuthor({ name: post.data.author, iconURL: userImage, url: "https://reddit.com/u/" + post.data.author })
		.setDescription(post.data.selftext.length < 4000 ? post.data.selftext : post.data.selftext.substring(0, 4000) + "...")
		.setFooter({ text: `r/${post.data.subreddit}`, iconURL: subredditImage })
		;

	if (post.data.thumbnail && post.data.thumbnail.startsWith("http"))
		embed.setThumbnail(post.data.thumbnail)
	if (post.data.link_flair_background_color)
		embed.setColor(post.data.link_flair_background_color as Discord.ColorResolvable);

	return embed;
}