"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const authOptions_1 = require("@/app/utils/authOptions");
const next_auth_1 = require("next-auth");
const user_1 = __importDefault(require("@/models/user"));
const cargo_1 = __importDefault(require("@/models/cargo"));
async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await (0, mongodb_1.connectMongoDB)();
        const user = await user_1.default.findById(session.user.id);
        if (!user) {
            console.warn("User not found.");
            return server_1.NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }
        const cargo = await cargo_1.default.findOne({ userId: user._id });
        if (!cargo) {
            console.warn("Cargo not found for the user.");
            return server_1.NextResponse.json({ ok: false, error: "Cargo not found" }, { status: 404 });
        }
        return server_1.NextResponse.json({ ok: true, cargo: cargo.tipo, userId: user._id });
    }
    catch (error) {
        console.error("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
