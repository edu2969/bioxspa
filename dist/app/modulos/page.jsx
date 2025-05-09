"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Modulos;
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const constants_1 = require("../utils/constants");
const page_1 = __importDefault(require("./homeGerencia/page"));
const page_2 = __importDefault(require("./homeAdministrador/page"));
const page_3 = __importDefault(require("./homeDespacho/page"));
const page_4 = __importDefault(require("./homeConductor/page"));
async function Modulos() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return (<>
            {(session && session.user.role == constants_1.USER_ROLE.neo) ? <div>yGa</div> :
            (session && session.user.role == constants_1.USER_ROLE.manager) ? <page_1.default /> :
                (session && session.user.role == constants_1.USER_ROLE.conductor) ? <page_4.default /> :
                    (session && session.user.role == constants_1.USER_ROLE.supplier) ? <page_3.default />
                        : <page_2.default />}
        </>);
}
