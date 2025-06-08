"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Despacho;
const PreparacionDePedidos_1 = __importDefault(require("@/components/PreparacionDePedidos"));
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
async function Despacho() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return <PreparacionDePedidos_1.default session={session}/>;
}
