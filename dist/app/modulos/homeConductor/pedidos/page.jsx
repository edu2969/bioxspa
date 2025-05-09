"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreparacionDePedidosPage;
const next_1 = require("next-auth/next");
const authOptions_1 = require("@/app/utils/authOptions");
const Despacho_1 = __importDefault(require("@/components/Despacho"));
async function PreparacionDePedidosPage() {
    const session = await (0, next_1.getServerSession)(authOptions_1.authOptions);
    return <Despacho_1.default session={session}/>;
}
