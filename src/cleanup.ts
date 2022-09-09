/**
 * Removes unused collections that somehow ended up not deleted.
 * 
 */

import { client, db } from "./main";

async function cleanup() {
    await db.connect();
    let collections = await db.getAllCollections();
    let collectionNames: string[] = [];
    for (let c of collections) {
        let name = c.namespace.split(".")[1];
        if (name != "botStatistics" && name != "subscriptionInfo")
            collectionNames.push(name);
    }

    
    let guilds = client.guilds;
    let subscriptions = await db.getSubscriptions();

    await guilds.fetch();
    for(let s of subscriptions){
        guilds.fetch()
        let i = collectionNames.indexOf(s.subreddit);
        if(i >= 0){
            collectionNames.splice(i, 1);
        }
    }

    console.log(`There are ${collectionNames.length} unnecessary collections. Removing...`);
    
    for(let c of collectionNames){
        await db.removeCollection(c);
    }
    console.log(`Removed.`);
}

cleanup();