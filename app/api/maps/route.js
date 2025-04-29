import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    console.log("MAPS API CALLED", query);
    
    if (!query) {
        return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("DATA", data);
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Error fetching data from Google Maps API" }, { status: 500 });
    }
}