import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    console.log("getAll USERS...");
    await connectMongoDB();
    const users = await User.find();
    return NextResponse.json({ users });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectMongoDB();
    const params = await req.json();
    console.log("Users POST...", params);
    const exists = await User.findOne(params._id ? { _id: params.id } : { email: params.email });
    if (exists) {
      console.log("BODY UPDATE", exists._id, body);
      const user = await User.findByIdAndUpdate(exists._id, body, {
        new: true
      });
      return user ? NextResponse.json(user) : NextResponse.json("NOT UPDATED", {
        status: 404,
      });
    }    

    const hashedPassword = await bcrypt.hash(password, 10);
    params.password = hashedPassword;
    return NextResponse.json({
      ok: true,
      id: await User.create(params)
    });
  } catch (error) {
    console.log("ERROR!", error);
    return NextResponse.json(error.message, {
      status: 404,
    })
  }
}