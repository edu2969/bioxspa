"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    console.log("MAPS API CALLED", query);
    if (!query) {
        return server_1.NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("DATA", data);
        return server_1.NextResponse.json(data);
    }
    catch (_a) {
        return server_1.NextResponse.json({ error: "Error fetching data from Google Maps API" }, { status: 500 });
    }
}
