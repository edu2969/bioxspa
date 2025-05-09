"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Register;
const RegisterForm_1 = __importDefault(require("@/components/RegisterForm"));
const next_auth_1 = require("next-auth");
const navigation_1 = require("next/navigation");
const authOptions_1 = require("@/app/utils/authOptions");
async function Register() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    if (session)
        (0, navigation_1.redirect)("/dashboard");
    return <RegisterForm_1.default />;
}
