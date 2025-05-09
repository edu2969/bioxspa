"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_2 = require("next-auth/react");
const SignIn = () => {
    const [userInfo, setUserInfo] = (0, react_1.useState)({ email: '', password: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await (0, react_2.signIn)('credentials', {
            email: userInfo.email,
            password: userInfo.password,
            redirect: false
        });
        console.log(res);
    };
    return <div className="sign-in-form">
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input value={userInfo.email} onChange={({ target }) => setUserInfo(Object.assign(Object.assign({}, userInfo), { email: target.value }))} type="email" placeholder="john@email.com"/>
      <input value={userInfo.password} onChange={({ target }) => setUserInfo(Object.assign(Object.assign({}, userInfo), { password: target.value }))} type="password" placeholder="****"/>
      <input type="submit" value="login"/>
    </form>
  </div>;
};
exports.default = SignIn;
