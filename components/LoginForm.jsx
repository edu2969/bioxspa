"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const onError = (errors, e) => console.log(errors, e)

  const {
    register,
    formState: {
      errors
    },
    handleSubmit,
  } = useForm();
  const [error, setError] = useState("");

  const onSubmit = async (data) => {
    setError(false);
    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res.error) {
        setError("Invalid Credentials");
        return;
      }
      router.replace("modulos");
    } catch (error) {
      console.log(error);
      setError(error);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      
      <div className="area z-0">
        <ul className="circles">
          <li></li><li></li><li></li><li></li><li></li>
          <li></li><li></li><li></li><li></li><li></li>
        </ul>
      </div>
      <div className="z-10 flex min-h-full flex-col justify-center py-6">
        <div className="flex sm:mx-auto sm:w-full sm:max-w-sm">                    
          <Image width={80} height={80} src="/brand.png" alt="BIOXSPA-Brand" className="mx-auto w-80 mt-6" />          
          <span className="text-xs text-gray-400 mt-40">v0.9</span>
        </div>
      </div>      
      <form className="z-10 mt-2 sm:mx-auto sm:w-full sm:max-w-sm" onSubmit={handleSubmit(onSubmit, onError)}>
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6">DIRECCIÓN EMAIL</label>
            <div className="mt-2">
              {errors.email && <p className="text-red-500">e-mail requerido</p>}
              <input {...register("email", { required: true })}
                id="email" name="email" type="email" autoComplete="email" required className="p-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium leading-6">CONTRASEÑA</label>
              <div className="text-sm">
                <a href="#" className="font-semibold text-sky-600 hover:text-sky-900">Olvidaste tu contraseña?</a>
              </div>
            </div>
            <div className="mt-2">
              {errors.password && <p className="text-red-500">Password requerido</p>}
              <input {...register("password", { required: true })}
                id="password" name="password" type="password" autoComplete="current-password"
                required className="p-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6" />
            </div>
          </div>
          {error && <span className="text-red-500">{error}</span>}
          <div>
            <button type="submit" onSubmit={handleSubmit(onSubmit)}
              className="flex w-full justify-center rounded-md bg-black px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">Entrar</button>
          </div>
        </div>
      </form>
    </main>
  );
}