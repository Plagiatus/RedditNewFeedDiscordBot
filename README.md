# RedditNewFeedDiscordBot
A discord.js bot that properly reads the /new feed of a given subreddit and posts it into a selected channel

[![Invite to discord](https://img.shields.io/static/v1?label=Discord&message=Invite%20to%20discord&style=flat-square&logo=discord&color=7289DA)](https://discord.com/api/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200)  
![Amount of discords served](https://img.shields.io/endpoint?url=https://redditbot.maptesting.de/shield/joinamount&style=flat-square&color=green&label=Joined%20discord%20servers)
![Amount of discords served](https://img.shields.io/endpoint?url=https://redditbot.maptesting.de/shield/subredditamount&style=flat-square&color=informational&label=Watching%20subreddits)

## Invite to your Discord
You can invite the bot to your own discord server by clicking [here](https://discord.com/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200).

The owner as well as all roles with either global "manage channels", "manage server", or "administrator" permission will be able to manage the bot.

## Improvements

Improvement ideas and pull requests are welcome.


## Host it yourself

If you want to host the bot yourself, you need a few prequisites:

- an up to date [Node.js](https://nodejs.org/) installation (16.6.0 or higher)
- a [MongoDB](https://www.mongodb.com/) Database (either local or hosted) that you can give the bot access to
- registered discord bot as part of an application (https://discord.com/developers/applications)
	- When inviting the bot, make sure your application requests the `applications.commands` scope as well as the "send messages" and "embed links and files" permissions for the bot. So the invitation link should look like this:  
	https://discord.com/oauth2/authorize?client_id=[clientID]&scope=applications.commands%20bot&permissions=51200
- a channel in your discord server that the posts should be posted into

### Setup

1. Clone the repository locally
2. Run `npm install` inside the root directory.
3. Setup a `src/config.json` file as described below
4. Run `npm start`

#### Config file
The config.json file, located in the src folder, needs to include the following fields:

```jsonc
{
	"botToken": "[your bot token]",
	"db": {
		"name": "[database name]",
		"user": "[db username]",						//can be empty if local DB is used
		"password": "[db password]",				//can be empty if local DB is used
		"url": "[db url, without the protocol]", //e.g. "localhost:27017" or "some.thing.mongodb.net"
		"isAtlas": false						//true if using mongodb.com or other altas provider
	},
	"refreshIntervall": 5				//how often you want the bot to press F5 on the subreddits, in minutes
}
```