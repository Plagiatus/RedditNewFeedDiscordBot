import * as http from "http";
import { db } from "./main";

export default class HttpServer {
	server: http.Server;
	paths: Map<string, Function>;
	constructor(port: number) {
		this.server = http.createServer(this.handleRequest.bind(this)).listen(process.env.PORT || port);
		this.paths = new Map<string, Function>();
		this.registerPaths();

	}

	private async handleRequest(req: http.IncomingMessage, res: http.OutgoingMessage) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("content-type", "application/json");

		if (!req.url) {
			res.write(this.createError("No request URL recieved", 400));
			res.end();
			return;
		}
		// let url = new URL(req.url, `http://${req.headers.host}`);
		let functionToCall = this.paths.get(req.url);
		if (!functionToCall) {
			res.write(this.createError("Requested url not found.", 404));
			res.end();
			return;
		}
		await functionToCall(req, res);

		res.end();
	}

	private createError(message: string, code: number = 500): string {
		return JSON.stringify({ error: { code, message } });
	}

	private registerPaths() {
		this.paths.set("/shield/joinamount", this.shieldJoinAmount);
		this.paths.set("/shield/subredditamount", this.shieldSubredditAmount);
		this.paths.set("/shield/postamount", this.shieldPostAmount);
	}

	private async shieldJoinAmount(req: http.IncomingMessage, res: http.OutgoingMessage) {
		let total = await db.amountDiscordServers();
		res.write(JSON.stringify(makeShieldResponse(total.toString(), "Joined discord servers")))
	}
	private async shieldSubredditAmount(req: http.IncomingMessage, res: http.OutgoingMessage) {
		let total = await db.amountSubreddits();
		res.write(JSON.stringify(makeShieldResponse(total.toString(), "Watched subreddits")))
	}
	private async shieldPostAmount(req: http.IncomingMessage, res: http.OutgoingMessage) {
		let total: string = await db.amountPosts();
		res.write(JSON.stringify(makeShieldResponse(total, "Posted posts")))
	}
}

function makeShieldResponse(message: string, label: string, color?: string, labelColor?: string): any {
	return {
		schemaVersion: 1,
		message,
		label,
		color,
		labelColor
	}
}