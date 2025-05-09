"use strict";
"use client";
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
const react_1 = __importStar(require("react"));
const react_toastify_1 = require("react-toastify");
require("react-toastify/dist/ReactToastify.css");
const react_toastify_2 = require("react-toastify");
const tb_1 = require("react-icons/tb");
const ImportacionPage = () => {
    const [file, setFile] = (0, react_1.useState)(null);
    const handleFileChange = (event) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };
    const handleUpload = async () => {
        if (!file) {
            react_toastify_1.toast.error("Por favor seleccione un archivo.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            var _a;
            try {
                const json = JSON.parse((_a = event.target) === null || _a === void 0 ? void 0 : _a.result);
                const body = {
                    filename: file.name,
                    entities: json
                };
                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (data.ok) {
                    react_toastify_1.toast.success("Archivo procesado exitosamente.");
                }
                else {
                    react_toastify_1.toast.error(data.message || "Error al procesar el archivo.");
                }
            }
            catch (error) {
                react_toastify_1.toast.error("Error al procesar el archivo.");
                console.error(error);
            }
        };
        reader.readAsText(file);
    };
    return (<div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl uppercase mb-4">Importación de datos</h1>
            <div className="flex items-center">
                <input type="file" accept=".json" onChange={handleFileChange} style={{ width: '380px' }}/>
                <button onClick={handleUpload} className="ml-2 flex items-center bg-blue-500 text-white px-4 py-2 rounded">
                    <tb_1.TbDatabaseImport className="mr-2"/>
                    IMPORTAR
                </button>
            </div>
            <react_toastify_2.ToastContainer />
        </div>);
};
exports.default = ImportacionPage;
