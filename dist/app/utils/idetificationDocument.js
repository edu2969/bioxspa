"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = formatRUT;
function formatRUT(rut) {
    // Remove any non-numeric characters except for 'k' or 'K'
    rut = rut.replace(/[^0-9kK]/g, '');
    // Split the RUT into the body and the verifier digit
    let body = rut.slice(0, -1);
    let verifier = rut.slice(-1);
    // Add dots every three digits from the end of the body
    body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    // Return the formatted RUT
    return `${body}-${verifier}`;
}
