"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const main_1 = require("./main");
class HttpServer {
    constructor(port) {
        this.server = http.createServer(this.handleRequest.bind(this)).listen(process.env.PORT || port);
        this.paths = new Map();
        this.registerPaths();
    }
    async handleRequest(req, res) {
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
    createError(message, code = 500) {
        return JSON.stringify({ error: { code, message } });
    }
    registerPaths() {
        this.paths.set("/shield/joinamount", this.shieldJoinAmount);
        this.paths.set("/shield/subredditamount", this.shieldSubredditAmount);
    }
    async shieldJoinAmount(req, res) {
        let total = await main_1.db.amountDiscordServers();
        res.write(JSON.stringify(makeShieldResponse(total.toString(), "Joined discord servers")));
    }
    async shieldSubredditAmount(req, res) {
        let total = await main_1.db.amountSubreddits();
        res.write(JSON.stringify(makeShieldResponse(total.toString(), "Watched subreddits")));
    }
}
exports.default = HttpServer;
function makeShieldResponse(message, label, color, labelColor) {
    return {
        schemaVersion: 1,
        message,
        label,
        color,
        labelColor
    };
}
