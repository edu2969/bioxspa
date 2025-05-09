"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VentasPage;
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const Venta_1 = __importDefault(require("@/components/ventas/Venta"));
async function VentasPage() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return <Venta_1.default session={session}/>;
}
