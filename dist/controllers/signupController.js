import { signupSchema } from "../models/signupModel.js";
import { hashPassword } from "../utils/bcrypt.js";
import { db } from "../utils/db-util.js";
import { v4 as uuidv4 } from "uuid";
import { generateToken } from "../utils/jwt-util.js";
import { setSession } from "../utils/redis.js";
import { sendSignupAlert, sendVerificationCode } from "../utils/mailer.js";
/**
 * Normalize phone number to E.164 (+254...) if user entered local 07...
 */
function normalizePhone(phone) {
    if (!phone)
        return undefined;
    if (phone.startsWith("0")) {
        return "+254" + phone.substring(1);
    }
    return phone;
}
export async function signupController(c) {
    const body = await c.req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
            hint: "Phone must be in format +2547XXXXXXXX or 07XXXXXXXX"
        }, 400);
    }
    let { email, phone_number, password, display_name, country, timezone, role } = parsed.data;
    phone_number = normalizePhone(phone_number);
    // Hardened role validation
    const assignedRole = role ?? "User";
    const allowedFrontendRoles = ["User", "Customer Care"];
    if (!allowedFrontendRoles.includes(assignedRole)) {
        return c.json({ error: "Invalid role assignment. Only User or Customer Care allowed at signup." }, 403);
    }
    const id = uuidv4();
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();
    /**
     * ATOMIC TRANSACTION START
     */
    const tx = await db.transaction("write");
    try {
        // 1. Duplicate check inside transaction
        const existing = await tx.execute({
            sql: `SELECT id FROM users WHERE email = ? OR phone_number = ?`,
            args: [email, phone_number]
        });
        if (existing.rows.length > 0) {
            await tx.rollback();
            return c.json({
                error: "Account already exists with this email or phone number",
                hint: "Try logging in or resetting your password"
            }, 409);
        }
        // 2. Insert new user
        await tx.execute({
            sql: `INSERT INTO users (
           id, role, permissions, email, phone_number, password_hash,
           display_name, country, timezone, is_verified, created_at, updated_at
         )
         VALUES (?,?,?,?,?,?,?,?,?,false,?,?)`,
            args: [id, assignedRole, "{}", email, phone_number, password_hash, display_name, country, timezone, now, now]
        });
        // 3. Create session + JWT
        const sessionId = uuidv4();
        const token = generateToken({ id, role: assignedRole, session_id: sessionId }, "1h");
        // Redis operations (External to SQL, but grouped in the logic)
        await setSession(`session:${sessionId}`, id, 3600);
        // 4. Verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await setSession(`verify:${id}`, otp, 600);
        // 5. Send signup + verification emails
        // (Note: In a high-traffic system, you might move these outside the transaction 
        // to prevent slow network calls from hanging the DB lock)
        await Promise.all([
            sendSignupAlert(email, display_name),
            sendVerificationCode(email, otp),
        ]);
        // 6. Commit SQL changes
        await tx.commit();
        // ✅ Hybrid token delivery
        c.header("Authorization", `Bearer ${token}`);
        c.cookie("auth_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            domain: ".housika.co.ke",
            maxAge: 3600,
        });
        return c.json({
            message: "Signup successful. You are now logged in. Check your email for verification to unlock all features.",
            user_id: id,
            role: assignedRole,
            token,
        }, 201);
    }
    catch (err) {
        // Rollback DB if anything fails
        await tx.rollback();
        console.error("Signup atomic failure:", err);
        return c.json({ error: "Signup failed. Please try again later." }, 500);
    }
}
