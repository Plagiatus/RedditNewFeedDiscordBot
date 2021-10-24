import *  as https from "https";
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
	let posts: Post[] = (await sendRedditRequest(newPostUrl(sub))).data.children;
	let newPosts: Post[] = [];
	for (let i: number = 0; i < posts.length; i++) {
		let post = posts[i];
		if (await db.wasPostAlreadyPosted(sub, post)) return newPosts;
		newPosts.push(post);
	}
	return newPosts;
}

export async function grabInitialPosts(sub: string) {
	let posts: Post[] = (await sendRedditRequest(newPostUrl(sub))).data.children;
	db.addPostsToDB(sub, posts);
}

export async function getUserInfo(name: string): Promise<RedditUser>{
	return sendRedditRequest(userInfoUrl(name));
}
export async function getSubredditInfo(name: string): Promise<SubredditInfo>{
	return sendRedditRequest(subredditInfoUrl(name));
}

export function fixImageUrl(url: string | undefined): string | undefined {
	if(!url) return undefined;
	
	let urlObj = new URL(url);
	return urlObj.origin + urlObj.pathname;
}