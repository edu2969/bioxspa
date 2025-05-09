"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const user_1 = __importDefault(require("@/models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function GET(req, props) {
    const params = await props.params;
    console.log("getById...", params);
    await (0, mongodb_1.connectMongoDB)();
    const users = await user_1.default.find({ _id: params.id }, { password: 0, __v: 0 });
    return server_1.NextResponse.json(users.length ? { user: users[0] } : ("User " + params + " not found", {
        status: 400,
    }));
}
async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    console.log("Update...", body, params);
    const userData = {
        name: body.name,
        email: body.email,
        role: body.role,
        rut: body.rut,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        avatarImg: body.avatarImg,
        clientId: body.clientId,
    };
    if (params.id || (body.repassword == body.password)) {
        userData.password = await bcryptjs_1.default.hash(body.password, 10);
    }
    const userUpdated = await user_1.default.findByIdAndUpdate(params.id, userData);
    return userUpdated ? server_1.NextResponse.json(userUpdated) : server_1.NextResponse.json(error.message, {
        status: 404,
    });
}
