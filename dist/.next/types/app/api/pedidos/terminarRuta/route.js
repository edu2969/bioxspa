"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// File: D:\git\bioxspa\app\api\pedidos\terminarRuta\route.js
const entry = __importStar(require("../../../../../../app/api/pedidos/terminarRuta/route.js"));
// Check that the entry is a valid entry
checkFields();
// Check the prop type of the entry function
if ('GET' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('HEAD' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('OPTIONS' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('POST' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('PUT' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('DELETE' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the prop type of the entry function
if ('PATCH' in entry) {
    checkFields();
    checkFields();
    checkFields();
}
// Check the arguments and return type of the generateStaticParams function
if ('generateStaticParams' in entry) {
    checkFields();
    checkFields();
}
function checkFields() { }
