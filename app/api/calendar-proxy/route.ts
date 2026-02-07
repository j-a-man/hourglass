
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
        return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 })
    }

    // 1. Handle Protocol
    let targetUrlString = url
    if (url.startsWith("webcal://")) {
        targetUrlString = "https://" + url.substring(9)
    }

    console.log("Proxying Calendar URL:", targetUrlString) // Debug Log

    try {
        const targetUrl = new URL(targetUrlString)

        // 2. Validation (Log only for now)
        if (!targetUrl.hostname.includes("google") && !targetUrl.hostname.includes("apple") && !targetUrl.hostname.includes("office")) {
            console.warn("Proxying non-standard calendar domain:", targetUrl.hostname)
        }

        const response = await fetch(targetUrlString)

        if (!response.ok) {
            console.error(`Proxy Fetch Failed: ${response.status} ${response.statusText}`)
            return NextResponse.json({
                error: `Failed to fetch from Google (${response.status}): ${response.statusText}. Ensure the link is public or the Secret Address.`
            }, { status: response.status })
        }

        const data = await response.text()

        if (!data.includes("BEGIN:VCALENDAR")) {
            console.error("Invalid ICS Data received")
            return NextResponse.json({ error: "Invalid calendar format received. Ensure this is an ICS link." }, { status: 400 })
        }

        return new NextResponse(data, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Cache-Control": "no-store, max-age=0",
            },
        })

    } catch (error) {
        console.error("Proxy Internal Error:", error)
        return NextResponse.json({ error: "Server Error: Failed to process request." }, { status: 500 })
    }
}
