'use server';

import nodemailer from 'nodemailer';

/**
 * Server Actions for sending emails. 
 * By using 'use server', Next.js ensures this code only ever runs on the server,
 * preventing 'child_process' and other Node-only module errors in the browser.
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PRIMARY_COLOR = '#2563EB';
const BG_COLOR = '#F9FAFB';

/**
 * Shared layout wrapper for Hourglass emails
 */
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${BG_COLOR}; margin: 0; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #ffffff; padding: 32px; border-bottom: 1px solid #f3f4f6; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; color: #111827; text-decoration: none; letter-spacing: -0.025em; }
        .content { padding: 48px 32px; }
        .h1 { font-size: 30px; font-weight: 800; color: #111827; margin: 0 0 16px; letter-spacing: -0.025em; }
        .text { font-size: 16px; line-height: 24px; color: #4B5563; margin: 0 0 24px; }
        .button { display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; margin-top: 8px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); }
        .footer { padding: 32px; border-top: 1px solid #f3f4f6; text-align: center; }
        .footer-text { font-size: 14px; color: #9CA3AF; margin: 0; }
        .pharmacy-hint { font-size: 12px; color: #D1D5DB; margin-top: 16px; letter-spacing: 0.05em; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="${APP_URL}" class="logo">Hourglass</a>
            <div class="pharmacy-hint">Modern Management</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p class="footer-text">&copy; ${new Date().getFullYear()} Hourglass. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Sends a welcome email to a newly signed-up user
 */
export async function sendWelcomeEmailAction(to: string, displayName: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Email credentials not configured');
    return { success: false, error: 'Config missing' };
  }

  const content = `
        <h1 class="h1">Welcome aboard, ${displayName}</h1>
        <p class="text">We're thrilled to have you join Hourglass. Our mission is to make pharmacy operations smooth, efficient, and respect your team's valuable time.</p>
        <p class="text">You're now ready to:</p>
        <ul style="color: #4B5563; margin-bottom: 32px; line-height: 1.6;">
            <li>Clock in/out effortlessly at your pharmacy</li>
            <li>Monitor your schedule and earnings in real-time</li>
            <li>Manage time-off requests seamlessly</li>
        </ul>
        <a href="${APP_URL}/dashboard" class="button">Access Your Dashboard</a>
    `;

  try {
    const info = await transporter.sendMail({
      from: `"Hourglass" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Welcome to Hourglass!',
      html: getBaseTemplate(content),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends a shift assignment notification email to an employee
 */
export async function sendShiftAssignmentEmailAction(
  to: string,
  employeeName: string,
  locationName: string,
  shiftDate: string,
  startTime: string,
  endTime: string
) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Email credentials not configured');
    return { success: false, error: 'Config missing' };
  }

  const content = `
        <h1 class="h1">New Shift Assigned</h1>
        <p class="text">Hi <strong>${employeeName}</strong>, you've been assigned a new shift.</p>
        
        <div style="background-color: #F3F4F6; padding: 24px; border-radius: 16px; margin: 32px 0; border: 1px solid #E5E7EB;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em;">Date</td>
                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">${shiftDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em;">Time</td>
                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">${startTime} – ${endTime}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em;">Location</td>
                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">${locationName}</td>
                </tr>
            </table>
        </div>

        <a href="${APP_URL}/dashboard" class="button">View Your Schedule</a>
    `;

  try {
    const info = await transporter.sendMail({
      from: `"Hourglass" <${process.env.GMAIL_USER}>`,
      to,
      subject: `New Shift Assigned – ${shiftDate}`,
      html: getBaseTemplate(content),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending shift assignment email:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends an invitation email to potential team members
 */
export async function sendTeamInviteEmailAction(to: string, adminName: string, companyName: string, joinCode: string, inviteLink: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Email credentials not configured');
    return { success: false, error: 'Config missing' };
  }

  const content = `
        <h1 class="h1">You've been invited to ${companyName}</h1>
        <p class="text"><strong>${adminName}</strong> has invited you to join their pharmacy team on Hourglass.</p>
        <p class="text">Hourglass helps us manage scheduling, time-tracking, and payroll accurately, so you can focus on patient care.</p>
        
        <div style="background-color: #F3F4F6; padding: 24px; border-radius: 16px; margin: 32px 0; text-align: center; border: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em;">Company Join Code</p>
            <p style="margin: 12px 0 0; font-size: 36px; font-weight: 900; color: #111827; letter-spacing: 0.15em;">${joinCode}</p>
        </div>

        <div style="margin: 32px 0; text-align: center;">
            <a href="${inviteLink}" class="button" style="padding: 18px 48px; min-width: 200px;">Accept Invitation & Join Team</a>
            <p style="margin-top: 16px; font-size: 13px; color: #9CA3AF;">Link expires in 7 days or upon registration.</p>
        </div>

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #F3F4F6;">
            <p class="text" style="font-size: 13px; margin: 0;">Trouble with the button? Copy and paste this link into your browser:</p>
            <p style="font-size: 11px; color: ${PRIMARY_COLOR}; word-break: break-all; margin: 8px 0 0;">${inviteLink}</p>
        </div>
    `;

  try {
    const info = await transporter.sendMail({
      from: `"Hourglass" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Invitation to join ${companyName} on Hourglass`,
      html: getBaseTemplate(content),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending team invite email:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends a confirmation email that the account has been permanently deleted
 */
export async function sendAccountDeletedEmailAction(to: string, orgName: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Email credentials not configured');
    return { success: false, error: 'Config missing' };
  }

  const content = `
    <h1 class="h1">Account Deleted</h1>
    <p class="text">Your organization <strong>${orgName}</strong> and all associated data have been permanently deleted from Hourglass.</p>
    <p class="text">The following data was removed:</p>
    <ul style="color: #4B5563; font-size: 16px; line-height: 28px; padding-left: 24px; margin: 0 0 24px;">
      <li>All employee accounts</li>
      <li>All locations and geofencing data</li>
      <li>All shifts and schedules</li>
      <li>All time entries and clock-in records</li>
      <li>Your admin account</li>
    </ul>
    <p class="text">If you did not request this deletion, please contact support immediately.</p>
    <p class="text" style="color: #9CA3AF; font-size: 14px; margin-top: 32px;">This is an automated message. No further action is required.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Hourglass" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Hourglass account has been deleted`,
      html: getBaseTemplate(content),
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending account deleted email:', err);
    return { success: false, error: String(err) };
  }
}
