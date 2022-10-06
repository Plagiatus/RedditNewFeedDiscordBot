/**
 * Changes the database structure from
 * 
 * DB
 *  - subscriptionInfo
 *      {subreddit: "name", guilds: [...]}
 *  - subreddit1
 *      {post: "asdfgh"}
 *      {post: "asdfgi"}
 *  - subreddit2
 *      {post: "asdfgj"}
 *      {post: "asdfgk"}
 * 
 * to
 * 
 * DB
 *  - subscriptionInfo
 *      {subreddit: "name", guilds:[...], posts:["asdfgh", "asdfgi"]}
 */

import { Collection } from "mongodb";
import { Database } from "../database";

class DatabaseMigrator extends Database {
    async movePostsFromCollectionsToDocuments() {
        let subscriptions = await this.getSubscriptions();
        let mainCollection = this.getCollection();

        for (let subscription of subscriptions) {
            let subCollection = this.getCollection(subscription.subreddit.toLowerCase());
            let allPosts: { post: string }[] = await subCollection.find().sort({ _id: "asc" }).toArray() as { post: string }[];
            let newPosts: string[] = [];
            for (let post of allPosts) {
                newPosts.push(post.post);
            }
            mainCollection.updateOne(
                { subreddit: subscription.subreddit },
                {
                    $set: {
                        posts: newPosts
                    }
                }
            )
            this.removeCollection(subscription.subreddit);
        }
    }

    
	protected getCollection(name: string = "subscriptionInfo"): Collection {
		return this.client.db(this.data.config.db.name).collection(name);
	}
}

async function run() {
    const dbm = new DatabaseMigrator();
    await dbm.connect();
    dbm.movePostsFromCollectionsToDocuments();
}

run();