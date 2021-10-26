# RedditNewFeedDiscordBot
A discord.js bot that properly reads the /new feed of a given subreddit and posts it into a selected channel

[![Invite to discord](https://img.shields.io/static/v1?label=Discord&message=Invite%20to%20discord&style=flat-square&logo=discord&color=7289DA)](https://discord.com/api/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200)  
![Amount of discords served](https://img.shields.io/endpoint?url=https://redditbot.maptesting.de/shield/joinamount&style=flat-square&color=7289DA&label=Joined%20discord%20servers)

## Invite to my Discord
You can invite the bot to your own discord server by clicking [here](https://discord.com/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200).

Make sure you have a role with the "manage channels" permission in your server, as only those will be able to manage the bot.

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
3. 