"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
const main_1 = require("./main");
async function sendRedditRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", d => {
                data += d;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (error) {
                    reject(data);
                }
            });
            res.on("error", (e) => {
                console.error(e);
                reject();
            });
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                console.error("Response returned non-2xx Status code:", res.statusCode, res.statusMessage);
                reject("Response returned non-2xx Status code: " + res.statusCode + " " + res.statusMessage);
            }
        });
    });
}
exports.sendRedditRequest = sendRedditRequest;
function newPostUrl(sub) {
    return "https://www.reddit.com/r/" + sub + "/new.json";
}
exports.newPostUrl = newPostUrl;
function subredditUrl(sub) {
    return "https://www.reddit.com/r/" + sub + ".json";
}
exports.subredditUrl = subredditUrl;
function userInfoUrl(user) {
    return "https://www.reddit.com/user/" + user + "/about.json";
}
exports.userInfoUrl = userInfoUrl;
function subredditInfoUrl(sub) {
    return "https://www.reddit.com/r/" + sub + "/about.json";
}
exports.subredditInfoUrl = subredditInfoUrl;
async function checkForNewPosts(sub) {
    let posts = (await sendRedditRequest(newPostUrl(sub))).data.children;
    let newPosts = [];
    for (let i = 0; i < posts.length; i++) {
        let post = posts[i];
        if (await main_1.db.wasPostAlreadyPosted(sub, post))
            return newPosts;
        newPosts.push(post);
    }
    return newPosts;
}
exports.checkForNewPosts = checkForNewPosts;
async function grabInitialPosts(sub) {
    let posts = (await sendRedditRequest(newPostUrl(sub))).data.children;
    main_1.db.addPostsToDB(sub, posts);
}
exports.grabInitialPosts = grabInitialPosts;
async function getUserInfo(name) {
    return sendRedditRequest(userInfoUrl(name));
}
exports.getUserInfo = getUserInfo;
async function getSubredditInfo(name) {
    return sendRedditRequest(subredditInfoUrl(name));
}
exports.getSubredditInfo = getSubredditInfo;
function fixImageUrl(url) {
    if (!url)
        return undefined;
    let urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
}
exports.fixImageUrl = fixImageUrl;
