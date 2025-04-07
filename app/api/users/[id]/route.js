import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import bcrypt from "bcryptjs";


export async function GET(req, props) {
    const params = await props.params;
    console.log("getById...", params);
    await connectMongoDB();
    const users = await User.find({ _id: params.id }, { password: 0, __v: 0 });
    return NextResponse.json(users.length ? { user: users[0] } : ("User " + params + " not found", {
        status: 400,
    }));
}

export async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    console.log("Update...", body, params);
    const userData = {
        name: body.name,
        email: body.email,
        role: body.role,
        rut: body.rut,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        avatarImg: body.avatarImg,
        clientId: body.clientId,
    }
    if(params.id || (body.repassword == body.password)) { 
        userData.password = await bcrypt.hash(body.password, 10);
    }
    const userUpdated = await User.findByIdAndUpdate(params.id, userData);
    return userUpdated ? NextResponse.json(userUpdated) : NextResponse.json(error.message, {
        status: 404,
    })
}


