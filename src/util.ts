import * as https from "https";
import * as Discord from "discord.js";
import { db } from "./main";


export async function sendRedditRequest(url: string): Promise<any> {
	return new Promise((resolve, reject) => {
		try {
			https.get(url, {headers:{'User-Agent': 'discord:net.plagiatus.redditnewfeedbot (by /u/plagiatus)',}}, (res) => {
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
					console.error("Response returned non-2xx Status code:", res.statusCode, res.statusMessage, url);
					reject("Response returned non-2xx Status code: " + res.statusCode + " " + res.statusMessage + ": " + url);
					if(res.statusCode == 404 || res.statusCode == 403) {
						removeSubscriptions(url);
					}
				}
			})
		} catch (error) {
			console.error(error);
			reject();
		}
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
		console.error(error);
		return [];
		//TODO: remove subreddit from subscriptions
	}
}

export async function grabInitialPosts(sub: string) {
	try {
		let posts: Post[] = (await sendRedditRequest(newPostUrl(sub))).data.children;
		db.addPostsToDB(sub, posts);
	} catch (error) {
		console.error(error);
	}
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


let redditUserCache: Map<string, RedditUser> = new Map<string, RedditUser>();
export async function getUser(name: string): Promise<RedditUser> {
	let cachedResult: RedditUser | undefined = redditUserCache.get(name);
	if (cachedResult)
		return cachedResult;

	let newUser = await getUserInfo(name);
	redditUserCache.set(name, newUser);
	return newUser;
}

let subredditInfoCache: Map<string, SubredditInfo> = new Map<string, SubredditInfo>();
export async function getSubreddit(name: string): Promise<SubredditInfo> {
	let cachedResult: SubredditInfo | undefined = subredditInfoCache.get(name);
	if (cachedResult)
		return cachedResult;

	let newSub = await getSubredditInfo(name);
	subredditInfoCache.set(name, newSub);
	return newSub;
}

export function resetInfoCache(){
	redditUserCache = new Map<string, RedditUser>();
	subredditInfoCache = new Map<string, SubredditInfo>();
}

export function postEmbed(post: Post, user?: RedditUser, subreddit?: SubredditInfo): Discord.EmbedBuilder {
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

	let embed = new Discord.EmbedBuilder()
		.setTitle(`${flairText}${post.data.title}`.substring(0, 256))
		.setURL(`https://redd.it/${post.data.id}`)
		.setAuthor({ name: post.data.author, iconURL: userImage, url: "https://reddit.com/u/" + post.data.author })
		.setDescription(post.data.selftext.length < 4000 ? post.data.selftext || " " : post.data.selftext.substring(0, 4000) + "...")
		.setFooter({ text: `r/${post.data.subreddit}`, iconURL: subredditImage })
		;

	if ((post.data.post_hint && post.data.post_hint == "image") || (isUrlAnImage(post.data.url))) {
		embed.setImage(post.data.url);
	}
	else if (post.data.thumbnail && post.data.thumbnail.startsWith("http"))
		embed.setThumbnail(post.data.thumbnail)
	if (post.data.link_flair_background_color)
		embed.setColor(post.data.link_flair_background_color as Discord.ColorResolvable);

	return embed;
}

async function removeSubscriptions(subreddit: string){
	if(!subreddit.startsWith("https://www.reddit.com/r/")) return;
	subreddit = subreddit.substring(25);
	subreddit = subreddit.split(/[\.\/]/g)[0];
	console.log("[ERROR] have to remove subscriptions to:", subreddit);
	let si = await db.getSubscriptionsOfSubreddit(subreddit);
	if(!si) return;
	for(let guild of si.guilds){
		await db.removeSubscription(guild.guild, subreddit);
	}
}

function isUrlAnImage(url: string): boolean {
	if(url.endsWith(".png")) return true;
	if(url.endsWith(".jpg")) return true;
	if(url.endsWith(".jpeg")) return true;
	if(url.endsWith(".gif")) return true;
	if(url.endsWith(".gifv")) return true;
	if(url.endsWith(".webm")) return true;

	return false;
}
