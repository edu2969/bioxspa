"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = amountFormat;
function amountFormat(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
