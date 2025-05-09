"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
const Nav_1 = __importDefault(require("@/components/Nav"));
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const fonts_1 = require("@/app/fonts");
exports.metadata = {
    title: 'BIOX',
    description: 'by EDUARDO TRONCOSO',
};
async function RootLayout({ children }) {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return (<html lang="es-CL">
      <body className={`${fonts_1.roboto} ${fonts_1.orbitron} ${fonts_1.red_hat_display} red_hat_display`}>      
        {children}
        <Nav_1.default user={session === null || session === void 0 ? void 0 : session.user}></Nav_1.default>      
      </body>
    </html>);
}
