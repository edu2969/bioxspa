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
const HomeConductor_1 = __importDefault(require("@/components/HomeConductor"));
const HomeDespacho_1 = __importDefault(require("@/components/HomeDespacho"));
async function Modulos() {
    const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
    return (<>
            {(session && session.user.role == constants_1.USER_ROLE.neo) ? <div>yGa</div> :
            (session && session.user.role == constants_1.USER_ROLE.manager) ? <page_1.default /> :
                (session && session.user.role == constants_1.USER_ROLE.conductor) ? <HomeConductor_1.default session={session}/> :
                    (session && session.user.role == constants_1.USER_ROLE.supplier) ? <HomeDespacho_1.default session={session}/>
                        : <page_2.default />}
        </>);
}
