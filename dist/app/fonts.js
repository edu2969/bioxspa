"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orbitron = exports.orbitron_init = exports.red_hat_display = exports.red_hat_display_init = exports.roboto = exports.roboto_init = void 0;
const google_1 = require("next/font/google");
exports.roboto_init = (0, google_1.Roboto)({
    subsets: ['latin'],
    weight: "400",
    display: 'swap',
    variable: '--font-roboto'
});
exports.roboto = exports.roboto_init.variable;
exports.red_hat_display_init = (0, google_1.Red_Hat_Display)({
    subsets: ['latin'],
    weight: "400",
    display: 'swap',
    variable: '--font-red-hat-display'
});
exports.red_hat_display = exports.red_hat_display_init.variable;
exports.orbitron_init = (0, google_1.Orbitron)({
    subsets: ['latin'],
    weight: "400",
    display: 'swap',
    variable: '--font-orbitron'
});
exports.orbitron = exports.orbitron_init.variable;
