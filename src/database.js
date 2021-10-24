"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Mongo = __importStar(require("mongodb"));
const main_1 = require("./main");
const util_1 = require("./util");
class Database {
    constructor() {
        if (Database.instance)
            return Database.instance;
        let options = {};
        let url = `mongodb://${main_1.data.config.db.user}:${main_1.data.config.db.password}@${main_1.data.config.db.url}`;
        if (!main_1.data.config.db.user || !main_1.data.config.db.password) {
            url = `mongodb://${main_1.data.config.db.url}`;
        }
        this.client = new Mongo.MongoClient(url, options);
        this.connected = false;
        Database.instance = this;
    }
    getCollection(name = "subscriptionInfo") {
        return this.client.db(main_1.data.config.db.name).collection(name);
    }
    async connect() {
        if (this.connected)
            return;
        await this.client.connect();
        console.log("[DB] connected and ready");
        this.connected = true;
    }
    async getSubscriptions() {
        let collection = this.getCollection();
        return collection.find().toArray();
    }
    async getSubscriptionsInGuild(guild) {
        let collection = this.getCollection();
        return collection.find({ guilds: { $elemMatch: { guild } } }).toArray();
    }
    async addSubscription(guild, channel, subreddit) {
        subreddit = subreddit.toLowerCase();
        let gs = { channel, guild };
        let collection = this.getCollection();
        let result = await collection.findOne({ subreddit, guilds: { $elemMatch: { guild } } });
        if (result) {
            return;
        }
        let updateResult = await collection.updateOne({ subreddit }, {
            $set: {
                subreddit
            },
            $push: {
                guilds: gs
            }
        }, { upsert: true });
        // if this was the first one to sub to this subreddit, grab the latest posts so they don't get reposted immediately.
        if (updateResult.upsertedCount > 0)
            util_1.grabInitialPosts(subreddit);
    }
    async removeSubscription(guild, subreddit) {
        subreddit = subreddit.toLowerCase();
        let collection = this.getCollection();
        await collection.updateOne({ subreddit, guilds: { $elemMatch: { guild } } }, {
            $pull: {
                guilds: {
                    guild
                }
            }
        });
        //check if empty, and if it is empty, remove it from everywhere.
        let deleteResult = await collection.deleteMany({
            subreddit,
            guilds: []
        });
        if (deleteResult.deletedCount == 0) {
            return;
        }
        this.client.db(main_1.data.config.db.name).dropCollection(subreddit, (err, res) => { });
    }
    async doesSubscriptionAlreadyExist(guild, subreddit) {
        subreddit = subreddit.toLowerCase();
        let collection = this.getCollection();
        let document = await collection.findOne({
            subreddit,
            guilds: { $elemMatch: { guild } }
        });
        if (document)
            return true;
        return false;
    }
    async wasPostAlreadyPosted(subreddit, post) {
        subreddit = subreddit.toLowerCase();
        let collection = this.getCollection(subreddit);
        let posted = await collection.updateOne({ post: post.data.id }, {
            $set: {
                post: post.data.id
            }
        }, { upsert: true });
        if (posted.upsertedCount > 0)
            return false;
        return true;
    }
    async addPostsToDB(subreddit, posts) {
        subreddit = subreddit.toLowerCase();
        let collection = this.getCollection(subreddit);
        let postsToInsert = [];
        for (let post of posts) {
            postsToInsert.push({ post: post.data.id });
        }
        collection.insertMany(postsToInsert);
    }
}
exports.Database = Database;
