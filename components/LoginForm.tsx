"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Image from "next/image";
import Loader from "./Loader";
import { IoAlertCircle } from "react-icons/io5";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { stat } from "fs";

export default function LoginForm() {
  const router = useRouter();
  
  const onError = (errors: any, e: any) => console.log(errors, e);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [status, setStatus] = useState("");

  const supabase = getSupabaseBrowserClient();

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();

  const onSubmit = async (data: any) => {
    setStatus("");
    setIsLoggingIn(true);
    
    try {
      console.log('Intentando login con:', data.email);
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if(error) {
        setStatus(error.message);
      } else {
        console.log('Login exitoso, redirigiendo...');
        setRedirecting(true);
        router.replace("/pages");
      }
    } catch (error) {
      console.error('Error en onSubmit:', error);
      setStatus((error as Error).message || "Error en el login");
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between py-8 px-6">

      <div className="cilindro-bg area z-0">
        <ul className="circles">
          <li></li><li></li><li></li><li></li><li></li>
          <li></li><li></li><li></li><li></li><li></li>
        </ul>
      </div>
      <div className="z-10 flex min-h-full flex-col justify-center py-6">
        <div className="flex sm:mx-auto sm:w-full sm:max-w-sm px-12">
          <Image width={80} height={80} src="/brand.png" alt="BIOXSPA-Brand" className="mx-auto w-80 mt-6" priority={true} />
          <span className="text-xs text-gray-400 mt-28">v0.96-alpha</span>
        </div>
      </div>
      <form className="z-10 mt-2 w-72" onSubmit={handleSubmit(onSubmit, onError)}>
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6">DIRECCIÓN EMAIL</label>
            <div className="mt-2">
              {errors.email && <p className="text-red-500">e-mail requerido</p>}
              <input {...register("email", { required: true })}
                id="email" name="email" type="email" autoComplete="email" required className="h-12 text-lg p-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium leading-6">CONTRASEÑA</label>
              <div className="text-sm">
                <a href="#" className="font-semibold text-sky-600 hover:text-sky-900">¿La olvidaste?</a>
              </div>
            </div>
            <div className="mt-2">
              {errors.password && <p className="text-red-500">Password requerido</p>}
              <input {...register("password", { required: true })}
                id="password" name="password" type="password" autoComplete="current-password"
                required className="h-12 text-lg p-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
            </div>
            {status !== "" && <div className="flex text-red-500">
              <IoAlertCircle className="mr-1 mt-2" /><span className="mt-0.5">{status}</span>
            </div>}
          </div>
          <div>
            <button type="submit" onSubmit={handleSubmit(onSubmit)} disabled={isLoggingIn}
              className="w-full rounded-md bg-black px-3 py-2 text-lg font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 h-12">
                {isLoggingIn ? <Loader texto="Validando"/> : redirecting ? <Loader texto="Redirigiendo..."/> : "Entrar"}
            </button>
          </div>
        </div>
      </form>
      <div style={{
        position: "absolute",
        top: 72,
        right: 16,
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        zIndex: 50
      }}>
        {resolution.width} x {resolution.height}
      </div>
    </main>
  );
}