import * as Mongo from "mongodb";
import { data } from "./main";
import { grabInitialPosts } from "./util";


export class Database {
	static instance: Database | null;
	private client!: Mongo.MongoClient;
	private connected!: boolean;
	constructor() {
		if (Database.instance) return Database.instance;
		let options: Mongo.MongoClientOptions = {};
		let url: string = `mongodb`

		if (data.config.db.isAtlas) {
			url += "+srv";
		}
		url += `://`;
		if (!data.config.db.user || !data.config.db.password) {
			url += data.config.db.url;
		} else {
			url += `${data.config.db.user}:${data.config.db.password}@${data.config.db.url}`;
		}
		this.client = new Mongo.MongoClient(url, options);
		this.connected = false;

		Database.instance = this;
	}

	private getCollection(name: string = "subscriptionInfo"): Mongo.Collection {
		return this.client.db(data.config.db.name).collection(name);
	}

	async connect(): Promise<void> {
		if (this.connected) return;
		await this.client.connect();
		console.log("[DB] connected and ready");
		this.connected = true;
	}

	async getSubscriptions(): Promise<SubscriptionInfo[]> {
		let collection = this.getCollection();
		return collection.find().toArray() as Promise<SubscriptionInfo[]>;
	}

	async getSubscriptionsInGuild(guild: string): Promise<SubscriptionInfo[]> {
		let collection = this.getCollection();
		return collection.find({ guilds: { $elemMatch: { guild } } }).toArray() as Promise<SubscriptionInfo[]>;
	}

	async addSubscription(guild: string, channel: string, subreddit: string): Promise<void> {
		subreddit = subreddit.toLowerCase();
		let gs: GuildSubscription = { channel, guild };
		let collection = this.getCollection();
		let result = await collection.findOne({ subreddit, guilds: { $elemMatch: { guild } } });
		if (result) {
			return;
		}
		let updateResult = await collection.updateOne(
			{ subreddit },
			{
				$set: {
					subreddit
				},
				$push: {
					guilds: gs
				}
			},
			{ upsert: true }
		);

		// if this was the first one to sub to this subreddit, grab the latest posts so they don't get reposted immediately.
		if (updateResult.upsertedCount > 0)
			grabInitialPosts(subreddit);
	}

	async removeSubscription(guild: string, subreddit: string): Promise<void> {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection();

		await collection.updateOne(
			{ subreddit, guilds: { $elemMatch: { guild } } },
			{
				$pull: {
					guilds: {
						guild
					}
				}
			}
		);

		//check if empty, and if it is empty, remove it from everywhere.
		let deleteResult = await collection.deleteMany({
			subreddit,
			guilds: []
		});
		if (deleteResult.deletedCount == 0) {
			return;
		}
		this.client.db(data.config.db.name).dropCollection(subreddit, (err, res) => { });
	}

	async doesSubscriptionAlreadyExist(guild: string, subreddit: string): Promise<boolean> {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection();
		let document = await collection.findOne({
			subreddit,
			guilds: { $elemMatch: { guild } }
		})
		if (document) return true;
		return false;
	}

	async wasPostAlreadyPosted(subreddit: string, post: Post): Promise<boolean> {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection(subreddit);
		let posted = await collection.updateOne(
			{ post: post.data.id },
			{
				$set: {
					post: post.data.id
				}
			},
			{ upsert: true }
		);
		if (posted.upsertedCount > 0) return false;
		return true;
	}

	async addPostsToDB(subreddit: string, posts: Post[]) {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection(subreddit);

		let postsToInsert: { post: string }[] = [];
		for (let post of posts) {
			postsToInsert.push({ post: post.data.id });
		}
		if (postsToInsert.length == 0) {
			postsToInsert.push({ post: "00000" });
		}

		collection.insertMany(postsToInsert);
	}

	// Cache clearing
	async cleanCache(subreddit: string) {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection(subreddit);
		let size: number = await collection.find().count();
		if (size <= 50) return;
		let elementsToRemove = await collection.find().sort({ _id: "asc" }).limit(size - 50).toArray();
		for (let el of elementsToRemove) {
			collection.deleteOne({ _id: el._id });
		}
	}

	// amount of posted messages
	async addToTotalMessages(subreddit: string, n: number = 1) {
		subreddit = subreddit.toLowerCase();
		let collection = this.getCollection("botStatistics");
		collection.updateOne(
			{ subreddit },
			{
				$inc: {
					total: n
				}
			},
			{ upsert: true }
		)
	}

	async getTotalPostsInSubreddit(subreddit: string): Promise<number> {
		let collection = this.getCollection(subreddit);
		return collection.find().count();
	}

	// STATS
	async amountDiscordServers(): Promise<number> {
		let collection = this.getCollection();
		return (await collection.distinct("guilds")).length;
	}
	async amountSubreddits(): Promise<number> {
		let collection = this.getCollection();
		return collection.find().count();
	}
	async amountPosts(): Promise<string> {
		let collection = this.getCollection("botStatistics");
		let result = await collection.aggregate([{
			$group: {
				_id: 1,
				all: {
					$sum: "$total"
				},
				count: {
					$sum: 1
				}
			}
		}]).toArray();

		let num: number = result[0].all;
		if(num > 1000000){
			return (num / 1000000).toFixed(1) + "M";
		}
		if(num > 1000){
			return (num / 1000).toFixed(1) + "k";
		}
		return num.toString();
	}
}