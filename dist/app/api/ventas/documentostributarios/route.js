"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const documentoTributario_1 = __importDefault(require("@/models/documentoTributario"));
const server_1 = require("next/server");
async function GET(req) {
    console.log("GET request received");
    try {
        console.log("Connecting to MongoDB...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("Successfully connected to MongoDB");
        const { searchParams } = req.nextUrl;
        const venta = searchParams.get("venta") === "true";
        const compra = searchParams.get("compra") === "true";
        console.log("Fetching documentos tributarios...");
        const filter = {};
        if (venta)
            filter.venta = true;
        if (compra)
            filter.compra = true;
        const documentosTributarios = await documentoTributario_1.default.find(filter);
        console.log("Successfully fetched documentos tributarios");
        return server_1.NextResponse.json({ documentosTributarios });
    }
    catch (error) {
        console.error("Error fetching documentos tributarios:", error);
        return server_1.NextResponse.json({ error: "Error fetching documentos tributarios" }, { status: 500 });
    }
}
