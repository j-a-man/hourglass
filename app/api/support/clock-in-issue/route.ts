import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { locationId, locationName, reason, message, userName } = body;

        console.log(`[Support API] Received request from user ${userId}`);

        // Verify the user exists (extra safety)
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            console.error(`[Support API] User ${userId} not found in Firestore`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const userData = userDoc.data();
        const userEmail = userData?.email || 'no-email@example.com';
        const orgId = userData?.organizationId;
        console.log(`[Support API] User email: ${userEmail}, Org: ${orgId}`);

        // Fetch Organization Admins
        let adminEmails: string[] = [];
        if (orgId) {
            const adminsQuery = query(
                collection(db, "users"),
                where("organizationId", "==", orgId),
                where("role", "==", "admin")
            );
            const adminDocs = await getDocs(adminsQuery);
            adminEmails = adminDocs.docs.map(d => d.data().email).filter(e => e);
            console.log(`[Support API] Found ${adminEmails.length} admins for org ${orgId}`);
        }

        const recipients = adminEmails.length > 0 ? adminEmails : [process.env.GMAIL_USER];

        // Setup Nodemailer
        // NOTE: This requires GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
        console.log(`[Support API] Checking credentials. User: ${process.env.GMAIL_USER ? 'Set' : 'Missing'}, Pass: ${process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Missing'}`);
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            console.error("Missing Gmail credentials in environment variables.");
            return NextResponse.json({ error: 'Server configuration error (email credentials missing)' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: recipients.join(', '),
            replyTo: userEmail, // Allow admin to reply to the user
            subject: `[Clock-In Issue] ${userName || 'User'} at ${locationName || 'Unknown Location'}`,
            text: `
User Details:
Name: ${userName || 'Unknown'}
Email: ${userEmail}
User ID: ${userId}
Location: ${locationName || 'N/A'} (${locationId || 'N/A'})

Issue Reported:
Reason for Block: ${reason || 'N/A'}
User Message:
------------------------------------------------
${message}
------------------------------------------------

Timestamp: ${new Date().toLocaleString()}
            `,
            html: `
                <h3>Clock-In Issue Reported</h3>
                <p><strong>User:</strong> ${userName || 'Unknown'} (${userEmail})</p>
                <p><strong>Location:</strong> ${locationName || 'N/A'}</p>
                <p><strong>Reason for Block:</strong> ${reason || 'N/A'}</p>
                <hr />
                <p><strong>User Message:</strong></p>
                <blockquote style="background: #f9f9f9; padding: 10px; border-left: 5px solid #ccc;">
                    ${message ? message.replace(/\n/g, '<br>') : 'No message provided'}
                </blockquote>
                <hr />
                <p><small>Timestamp: ${new Date().toLocaleString()}</small></p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Support API] Email successfully sent for user ${userId}`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Support API] Email error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email', details: error.toString() }, { status: 500 });
    }
}
