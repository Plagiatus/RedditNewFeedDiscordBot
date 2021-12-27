import { db } from "./main";

async function main() {
	await db.connect();
	let allSubscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	for (let subscription of allSubscriptions) {
		let total: number = await db.getTotalPostsInSubreddit(subscription.subreddit);
		db.addToTotalMessages(subscription.subreddit, total);
	}

	console.log("DONNNNNNNNNNNEEEEEEEEEE")
}

main();