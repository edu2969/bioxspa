"use client"
import { useState } from "react";
import { signIn } from 'next-auth/react';

const SignIn = () => {
  const [userInfo, setUserInfo] = useState({ email: '', password: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await signIn('credentials', {
      email: userInfo.email,
      password: userInfo.password,
      redirect: false
    });
    console.log(res);
  }

  return <div className="sign-in-form">
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input value={userInfo.email} onChange={({ target }) => setUserInfo({ ...userInfo, email: target.value })} type="email" placeholder="john@email.com" />
      <input value={userInfo.password} onChange={({ target }) => setUserInfo({ ...userInfo, password: target.value })} type="password" placeholder="****" />
      <input type="submit" value="login" />
    </form>
  </div>
}

export default SignIn;