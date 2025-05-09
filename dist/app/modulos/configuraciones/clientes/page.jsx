"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlotaPage;
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const Clientes_1 = __importDefault(require("@/components/Clientes"));
async function FlotaPage() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    console.log("SESSION", session);
    return (<>
            <Clientes_1.default />
        </>);
}
