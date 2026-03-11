import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();
async function setup() {
    // Connect to Bunny Database
    const db = createClient({
        url: process.env.BUNNY_DATABASE_URL, // e.g. "libsql://your-db.bunny.net"
        authToken: process.env.authToken, // Bunny Database auth token
    });
    console.log("Connected to:", process.env.BUNNY_DATABASE_URL);
    // --- Users ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      role TEXT,
      permissions TEXT,
      email TEXT,
      phone_number TEXT,
      password_hash TEXT,
      is_verified BOOLEAN,
      display_name TEXT,
      country TEXT,
      timezone TEXT,
      last_login TIMESTAMP,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);`);
    // --- Properties ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id UUID PRIMARY KEY,
      landlord_id UUID,
      units_available INT,
      active_units INT,
      occupied_units INT,
      video_urls TEXT,
      image_urls TEXT,
      description TEXT,
      country TEXT,
      currency TEXT,
      location TEXT,
      exact_location TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);`);
    // --- Rooms ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS rooms (
      id UUID PRIMARY KEY,
      property_id UUID,
      room_number TEXT,
      category TEXT,
      currency TEXT,
      country TEXT,
      location TEXT,
      exact_location TEXT,
      amount DECIMAL,
      period TEXT,
      is_occupied BOOLEAN,
      start_at TIMESTAMP,
      ends_at TIMESTAMP,
      image_urls TEXT,
      video_urls TEXT,
      capacity INT,
      amenities TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);`);
    // --- Bookings ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY,
      user_id UUID,
      property_id UUID,
      room_id UUID,
      room_number TEXT,
      payment_id UUID,
      receipt_id UUID,
      receipt_number TEXT,
      start_at TIMESTAMP,
      ends_at TIMESTAMP,
      status TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`);
    // --- Payments ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY,
      user_id UUID,
      booking_id UUID,
      property_id UUID,
      room_number TEXT,
      receipt_id UUID,
      receipt_number TEXT,
      reference_type TEXT,
      gateway TEXT,
      gateway_reference TEXT,
      amount DECIMAL,
      currency TEXT,
      status TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_reference);`);
    // --- Receipts ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY,
      receipt_number TEXT,
      user_id UUID,
      landlord_id UUID,
      property_id UUID,
      room_number TEXT,
      booking_id UUID,
      payment_id UUID,
      file_url TEXT,
      amount DECIMAL,
      currency TEXT,
      qr_code TEXT,
      verification_status TEXT,
      verified_at TIMESTAMP,
      issued_by TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      expires_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_receipts_qr ON receipts(qr_code);`);
    // --- Chats ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id UUID PRIMARY KEY,
      conversation_id UUID,
      property_id UUID,
      room_number TEXT,
      landlord_id UUID,
      user_id UUID,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_chats_conversation ON chats(conversation_id);`);
    // --- Messages ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      chat_id UUID,
      property_id UUID,
      room_number TEXT,
      sender_id UUID,
      content TEXT,
      attachments TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);`);
    // --- Contact Messages ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id UUID PRIMARY KEY,
      email TEXT,
      phone_number TEXT,
      subject TEXT,
      message TEXT,
      replies TEXT,
      agent_id UUID,
      status TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);`);
    console.log("All Bunny Database tables created successfully!");
}
setup().catch(console.error);
