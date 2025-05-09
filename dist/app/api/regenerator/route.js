"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const venta_1 = __importDefault(require("@/models/venta"));
async function GET() {
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    await resetVentas();
    console.log("resetVentas function executed successfully");
    return server_1.NextResponse.json({ message: "Success migrate and improve" });
}
const resetVentas = async () => {
    // Delete all RutaDespacho documents
    await rutaDespacho_1.default.deleteMany({});
    console.log("All RutaDespacho documents deleted");
    // Update all Venta documents to set estado to 0
    await venta_1.default.updateMany({}, { estado: 0 });
    console.log("All Venta documents updated with estado set to 0");
};
