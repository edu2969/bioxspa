"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AsignacionPedidos;
const AsignacionPanel_1 = __importDefault(require("@/components/AsignacionPanel"));
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
async function AsignacionPedidos() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return <AsignacionPanel_1.default session={session}/>;
}
