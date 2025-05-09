"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterForm;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const navigation_1 = require("next/navigation");
function RegisterForm() {
    const [name, setName] = (0, react_1.useState)("");
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [error, setError] = (0, react_1.useState)("");
    const router = (0, navigation_1.useRouter)();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setError("All fields are necessary.");
            return;
        }
        try {
            const resUserExists = await fetch("api/userExists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
            const { user } = await resUserExists.json();
            if (user) {
                setError("User already exists.");
                return;
            }
            const res = await fetch("api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });
            if (res.ok) {
                const form = e.target;
                form.reset();
                router.push("/");
            }
            else {
                console.log("User registration failed.");
            }
        }
        catch (error) {
            console.log("Error during registration: ", error, {
                name,
                email,
                password,
            });
        }
    };
    return (<div className="grid place-items-center h-screen">
      <div className="shadow-lg p-5 rounded-lg border-t-4 border-green-400">
        <h1 className="text-xl font-bold my-4">Register</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input onChange={(e) => setName(e.target.value)} type="text" placeholder="Full Name"/>
          <input onChange={(e) => setEmail(e.target.value)} type="text" placeholder="Email"/>
          <input onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password"/>
          <button className="bg-green-600 text-white font-bold cursor-pointer px-6 py-2">
            Register
          </button>

          {error && (<div className="bg-red-500 text-white w-fit text-sm py-1 px-3 rounded-md mt-2">
              {error}
            </div>)}

          <link_1.default className="text-sm mt-3 text-right" href={"/"}>
            Already have an account? <span className="underline">Login</span>
          </link_1.default>
        </form>
      </div>
    </div>);
}
