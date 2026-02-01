import nodemailer from "nodemailer"

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

interface EmailOptions {
    to: string
    subject: string
    html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log("Email not configured, skipping:", { to, subject })
        return false
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"D'Fresto" <noreply@dfresto.com>`,
            to,
            subject,
            html,
        })
        console.log("Email sent to:", to)
        return true
    } catch (error) {
        console.error("Error sending email:", error)
        return false
    }
}

// Email templates
export function orderCreatedEmail(orderNumber: string, customerName: string, total: string) {
    return {
        subject: `Order Baru: ${orderNumber}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">D'Fresto</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Order Baru Diterima!</h2>
          <p style="color: #4b5563;">Anda menerima order baru dari <strong>${customerName}</strong></p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #1f2937;"><strong>Nomor Order:</strong> ${orderNumber}</p>
            <p style="margin: 5px 0; color: #1f2937;"><strong>Total:</strong> ${total}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Lihat Order
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} D'Fresto. All rights reserved.
        </div>
      </div>
    `,
    }
}

export function orderStatusEmail(
    orderNumber: string,
    status: string,
    statusLabel: string,
    customerName: string
) {
    const statusColors: Record<string, string> = {
        APPROVED: "#16a34a",
        REJECTED: "#dc2626",
        PROCESSING: "#9333ea",
        SHIPPED: "#2563eb",
        RECEIVED: "#059669",
        CANCELLED: "#dc2626",
    }

    return {
        subject: `Order ${orderNumber} - ${statusLabel}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">D'Fresto</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Status Order Diperbarui</h2>
          <p style="color: #4b5563;">Halo <strong>${customerName}</strong>,</p>
          <p style="color: #4b5563;">Order Anda telah diperbarui:</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #1f2937;"><strong>Nomor Order:</strong> ${orderNumber}</p>
            <p style="margin: 5px 0;">
              <strong>Status:</strong> 
              <span style="color: ${statusColors[status] || "#4b5563"}; font-weight: bold;">${statusLabel}</span>
            </p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/history" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Lihat Riwayat Order
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} D'Fresto. All rights reserved.
        </div>
      </div>
    `,
    }
}

export function orderShippedEmail(orderNumber: string, customerName: string, address: string) {
    return {
        subject: `Order ${orderNumber} Sedang Dikirim!`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">D'Fresto</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #1f2937;">🚚 Order Anda Sedang Dikirim!</h2>
          <p style="color: #4b5563;">Halo <strong>${customerName}</strong>,</p>
          <p style="color: #4b5563;">Kabar baik! Order Anda sedang dalam perjalanan.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #1f2937;"><strong>Nomor Order:</strong> ${orderNumber}</p>
            <p style="margin: 5px 0; color: #1f2937;"><strong>Tujuan:</strong> ${address}</p>
          </div>
          <p style="color: #4b5563;">Mohon siapkan tempat untuk menerima barang. Jangan lupa konfirmasi penerimaan di aplikasi!</p>
        </div>
        <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} D'Fresto. All rights reserved.
        </div>
      </div>
    `,
    }
}
