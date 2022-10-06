/**
 * Removes unused collections that somehow ended up not deleted.
 * 
 */

import { client, db } from "../main";

async function cleanup() {
    await db.connect();

    let guilds = client.guilds;
    let subscriptions = await db.getSubscriptions();

    await guilds.fetch();
    for (let s of subscriptions) {
        for (let g of s.guilds) {
            if (!guilds.cache.has(g.guild)) {
                console.log("Found unused guild subscription:", g.guild);
                let subscriptions = await db.getSubscriptionsInGuild(g.guild);
                for (let sub of subscriptions) {
                    await db.removeSubscription(g.guild, sub.subreddit);
                }
            }
        }
    }

    let collections = await db.getAllCollections();
    let collectionNames: string[] = [];
    for (let c of collections) {
        let name = c.namespace.split(".")[1];
        if (name != "botStatistics" && name != "subscriptionInfo")
            collectionNames.push(name);
    }

    
    subscriptions = await db.getSubscriptions();
    for (let s of subscriptions) {
        let i = collectionNames.indexOf(s.subreddit);
        if (i >= 0) {
            collectionNames.splice(i, 1);
        }
    }


    console.log(`There are ${collectionNames.length} unnecessary collections. Removing...`);

    for (let c of collectionNames) {
        await db.removeCollection(c);
    }
    console.log(`Removed.`);
}

cleanup();