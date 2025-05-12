"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Nav;
const react_1 = require("next-auth/react");
const link_1 = __importDefault(require("next/link"));
const react_2 = require("react");
const ai_1 = require("react-icons/ai");
const navigation_1 = require("next/navigation");
const md_1 = require("react-icons/md");
const io5_1 = require("react-icons/io5");
function Nav({ user }) {
    (0, react_2.useEffect)(() => {
        console.log("USER", user);
    }, [user]);
    const router = (0, navigation_1.useRouter)();
    const [menuActivo, setMenuActivo] = (0, react_2.useState)(false);
    const path = (0, navigation_1.usePathname)();
    return (<div className={`w-full absolute top-0 left-0 ${path === '/' ? 'hidden' : 'visible'}`}>
            <div className="absolute">
                <div className="flex">
                    <ai_1.AiOutlineMenu size="1.7rem" className="m-4 text-slate-800 cursor-pointer" onClick={() => setMenuActivo(true)}/>
                </div>
            </div>
            <div className="absolute right-0">                
                <link_1.default href={`/modulos`} onClick={() => setMenuActivo(false)}>
                    <ai_1.AiFillHome size="1.7rem" className="mt-4 mr-4 text-slate-800 justify-end cursor-pointer"/>
                </link_1.default>                
            </div>
            <div className={`min-w-2xl min-h-full z-50 absolute transition-all bg-[#313A46] p-6 ${menuActivo ? 'left-0' : '-left-full'}`}>
                <ai_1.AiOutlineClose size="2rem" className="text-white m-auto cursor-pointer absolute top-4 right-4" onClick={() => setMenuActivo(false)}/>
                <div className="mt-12 text-white space-y-6">
                    <link_1.default href="/modulos/configuraciones" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <io5_1.IoSettingsSharp size="4rem"/>
                            <p className="text-2xl ml-2 mt-4">CONFIGURACIONES</p>
                        </div>
                    </link_1.default>
                    <link_1.default href="/modulos/operacion" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <md_1.MdOutlinePropaneTank size="4rem"/>
                            <p className="text-2xl ml-2 mt-4">OPERACIÓN</p>
                        </div>
                    </link_1.default>
                    <link_1.default href="/modulos/about" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <ai_1.AiFillAliwangwang size="4rem"/>
                            <p className="text-2xl ml-2 mt-4">Acerca de...</p>
                        </div>
                    </link_1.default>
                    <button className="min-w-2xl flex hover:bg-white hover:text-[#9cb6dd] rounded-md p-2" onClick={() => {
            (0, react_1.signOut)({ redirect: false }).then(() => {
                router.push('/'); // Redirigir a la página de inicio después de cerrar sesión
            });
        }}>
                        <ai_1.AiOutlineLogout size="4rem"/>
                        <p className="text-2xl ml-2 mt-4">Cerrar sesión</p>
                    </button>
                </div>
            </div>
        </div>);
}
