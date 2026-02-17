import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "IS Defense Scheduler <noreply@pemgrg.com>";

/** Format a time string like "09:00:00" to "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

/** Format a date string like "2026-03-15" to "March 15, 2026" */
function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month - 1]} ${day}, ${year}`;
}

type BookingEmailData = {
  studentName: string;
  studentEmail: string;
  professors: { name: string; email: string }[];
  date: string;
  time: string;
  roomName: string;
};

/**
 * Send booking confirmation emails to the student and both professors.
 * Errors are logged but do not throw — the booking itself should still succeed.
 */
export async function sendBookingEmails(data: BookingEmailData) {
  const { studentName, studentEmail, professors, date, time, roomName } = data;
  const niceDate = formatDate(date);
  const niceTime = formatTime(time);

  const studentHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
      <h2 style="margin: 0 0 24px; font-size: 20px; color: #111;">Defense Confirmed</h2>
      <p style="margin: 0 0 16px; color: #333; line-height: 1.6;">Hi ${studentName},</p>
      <p style="margin: 0 0 24px; color: #333; line-height: 1.6;">Your I.S. oral defense has been scheduled. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555; width: 100px;">Date</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${niceDate}</td></tr>
        <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Time</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${niceTime}</td></tr>
        <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Room</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${roomName}</td></tr>
        <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Readers</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${professors.map(p => p.name).join(", ")}</td></tr>
      </table>
      <p style="margin: 0; color: #666; font-size: 13px;">If you need to reschedule, please contact the department administrator.</p>
    </div>`;

  const emailConfigs = [
    ...professors.map((prof) => ({
      from: FROM_EMAIL,
      to: prof.email,
      subject: `I.S. Oral Defense: ${studentName} — ${niceDate}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
          <h2 style="margin: 0 0 24px; font-size: 20px; color: #111;">New Defense Scheduled</h2>
          <p style="margin: 0 0 16px; color: #333; line-height: 1.6;">Hi ${prof.name},</p>
          <p style="margin: 0 0 24px; color: #333; line-height: 1.6;">You have been assigned as a reader for the following I.S. oral defense:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555; width: 100px;">Student</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${studentName}</td></tr>
            <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Date</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${niceDate}</td></tr>
            <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Time</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${niceTime}</td></tr>
            <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Room</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${roomName}</td></tr>
            <tr><td style="padding: 10px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #555;">Other Reader</td><td style="padding: 10px 12px; border: 1px solid #e5e5e5; color: #111;">${professors.filter(p => p.name !== prof.name).map(p => p.name).join(", ")}</td></tr>
          </table>
        </div>`,
    })),
    {
      from: FROM_EMAIL,
      to: studentEmail,
      subject: "Your I.S. Oral Defense is Confirmed",
      html: studentHtml,
    },
  ];

  try {
    for (let i = 0; i < emailConfigs.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 600));
      const result = await getResend().emails.send(emailConfigs[i]);
      if (result.error) {
        console.error(`Email FAILED (to: ${emailConfigs[i].to}):`, result.error);
      } else {
        console.log(`Email OK (to: ${emailConfigs[i].to}):`, result.data?.id);
      }
    }
  } catch (error) {
    console.error("Failed to send booking emails:", error);
  }
}
