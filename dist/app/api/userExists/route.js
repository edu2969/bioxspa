"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const user_1 = __importDefault(require("@/models/user"));
const server_1 = require("next/server");
async function POST(req) {
    try {
        console.log("HASTA ACA BIEN...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("POR ACA PASA");
        const { email } = await req.json();
        const user = await user_1.default.findOne({ email }).select("_id");
        console.log("user: ", user);
        return server_1.NextResponse.json({ user });
    }
    catch (error) {
        console.log(error);
    }
}
