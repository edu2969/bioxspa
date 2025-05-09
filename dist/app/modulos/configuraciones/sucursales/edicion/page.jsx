"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
const EditSucursal_1 = __importDefault(require("@/components/EditSucursal"));
function Page() {
    const googleMapsApiKey = process.env.GOOGLE_API_KEY;
    return (<EditSucursal_1.default googleMapsApiKey={googleMapsApiKey}/>);
}
