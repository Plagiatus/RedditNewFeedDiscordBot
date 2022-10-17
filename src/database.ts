import * as Mongo from "mongodb";
import { Data } from "./data";
import { grabInitialPosts } from "./util";

export class Database {
	static instance: Database | null;
	protected client!: Mongo.MongoClient;
	protected connected!: boolean;
	protected data = new Data();
	private subInfoCollection!: Mongo.Collection;
	private botStatsCollection!: Mongo.Collection;
	constructor() {
		if (Database.instance) return Database.instance;
		let options: Mongo.MongoClientOptions = {};
		let url: string = `mongodb`

		if (this.data.config.db.isAtlas) {
			url += "+srv";
		}
		url += `://`;
		if (!this.data.config.db.user || !this.data.config.db.password) {
			url += this.data.config.db.url;
		} else {
			url += `${this.data.config.db.user}:${this.data.config.db.password}@${this.data.config.db.url}`;
		}
		this.client = new Mongo.MongoClient(url, options);
		this.connected = false;

		Database.instance = this;

		this.subInfoCollection = this.client.db(this.data.config.db.name).collection("subscriptionInfo");
		this.botStatsCollection = this.client.db(this.data.config.db.name).collection("botStatistics");
	}

	async getAllCollections(): Promise<Mongo.Collection[]> {
		return this.client.db(this.data.config.db.name).collections()
	}

	async connect(): Promise<void> {
		if (this.connected) return;
		await this.client.connect();
		console.log("[DB] connected and ready");
		this.connected = true;
	}

	async getSubscriptions(): Promise<SubscriptionInfo[]> {
		let collection = this.subInfoCollection;
		return collection.find().toArray() as Promise<SubscriptionInfo[]>;
	}
	async getSubscriptionsOfSubreddit(subreddit: string): Promise<SubscriptionInfo> {
		let collection = this.subInfoCollection;
		return collection.findOne({ subreddit }) as Promise<SubscriptionInfo>;
	}

	async getSubscriptionsInGuild(guild: string): Promise<SubscriptionInfo[]> {
		let collection = this.subInfoCollection;
		return collection.find({ guilds: { $elemMatch: { guild } } }).toArray() as Promise<SubscriptionInfo[]>;
	}

	async addSubscription(guild: string, channel: string, subreddit: string): Promise<void> {
		subreddit = subreddit.toLowerCase();
		let gs: GuildSubscription = { channel, guild };
		let collection = this.subInfoCollection;
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
		let collection = this.subInfoCollection;

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
		this.client.db(this.data.config.db.name).dropCollection(subreddit, (err, res) => { });
	}

	async removeCollection(name: string) {
		this.client.db(this.data.config.db.name).dropCollection(name, (err, res) => { });
	}

	async doesSubscriptionAlreadyExist(guild: string, subreddit: string): Promise<boolean> {
		subreddit = subreddit.toLowerCase();
		let collection = this.subInfoCollection;
		let document = await collection.findOne({
			subreddit,
			guilds: { $elemMatch: { guild } }
		})
		if (document) return true;
		return false;
	}

	async wasPostAlreadyPosted(subreddit: string, post: Post): Promise<boolean> {
		subreddit = subreddit.toLowerCase();
		let collection = this.subInfoCollection;
		let posted = await collection.updateOne(
			{ subreddit: subreddit, posts: { $nin: [post.data.id] } },
			{
				$push: {
					posts: post.data.id
				}
			}
		);
		if (posted.modifiedCount > 0) return false;
		return true;
	}

	async addPostsToDB(subreddit: string, posts: Post[]) {
		subreddit = subreddit.toLowerCase();
		let collection = this.subInfoCollection;

		let postsToInsert: string[] = [];
		for (let post of posts) {
			postsToInsert.push(post.data.id);
		}
		if (postsToInsert.length == 0) {
			postsToInsert.push("00000");
		}

		collection.updateOne(
			{ subreddit },
			{
				$set: {
					posts: postsToInsert
				}
			}
		);
	}

	// Cache clearing
	async cleanCache(subInfo: SubscriptionInfo) {
		const maxCacheSize = 50;
		let collection = this.subInfoCollection;
		if (!subInfo.posts) { subInfo.posts = [] }
		else if (subInfo.posts.length <= maxCacheSize) return;
		subInfo.posts.splice(0, subInfo.posts.length - maxCacheSize);
		collection.updateOne(
			{ subreddit: subInfo.subreddit },
			{ $set: { posts: subInfo.posts } }
		)
	}

	// amount of posted messages
	async addToTotalMessages(subreddit: string, n: number = 1) {
		subreddit = subreddit.toLowerCase();
		let collection = this.botStatsCollection;
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

	/** 
	 * @deprecated 
	 */
	async getTotalPostsInSubreddit(subreddit: string): Promise<number> {
		let collection = this.subInfoCollection;
		return collection.find().count();
	}

	// STATS
	async amountDiscordServers(): Promise<number> {
		let collection = this.subInfoCollection;
		// return (await collection.distinct("guilds")).length;
		let result = await (await collection.aggregate(
			[
				{
				  '$project': {
					'g': '$guilds.guild'
				  }
				}, {
				  '$unwind': {
					'path': '$g', 
					'preserveNullAndEmptyArrays': false
				  }
				}, {
				  '$group': {
					'_id': 'blabla', 
					'guilds': {
					  '$addToSet': '$g'
					}
				  }
				}
			  ]
		)).next();

		return result?.guilds.length ?? 0;
	}
	async amountSubreddits(): Promise<number> {
		let collection = this.subInfoCollection;
		return collection.find().count();
	}
	async amountPosts(): Promise<string> {
		let collection = this.botStatsCollection;
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
		if (num > 1000000) {
			return (num / 1000000).toFixed(1) + "M";
		}
		if (num > 1000) {
			return (num / 1000).toFixed(1) + "k";
		}
		return num.toString();
	}
}