import { NextResponse } from "next/server";
import { connectToDatabase, UserDocument } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: List all users
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const users = await db
      .collection<UserDocument>("users")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch users" }, { status: 500 });
  }
}

// POST: Add new Dev or Admin user by email
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, displayName, role } = body;

    if (!email || !role || !["admin", "dev", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid email or role" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<UserDocument>("users");

    const emailLower = email.trim().toLowerCase();
    const existing = await usersCollection.findOne({ email: emailLower });

    if (existing) {
      // Update role if user already exists
      await usersCollection.updateOne(
        { _id: existing._id },
        { $set: { role, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true, message: "User role updated", user: { ...existing, role } });
    }

    const newUser: UserDocument = {
      uid: `pre_registered_${Date.now()}`,
      email: emailLower,
      displayName: displayName || emailLower.split("@")[0],
      photoURL: "",
      role: role as "admin" | "dev" | "viewer",
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const res = await usersCollection.insertOne(newUser);
    return NextResponse.json({ success: true, insertedId: res.insertedId, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to add user" }, { status: 500 });
  }
}

// PUT: Update user role
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { uid, email, role } = body;

    if (!role || !["admin", "dev", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const query: any = {};
    if (uid) query.uid = uid;
    else if (email) query.email = email.trim().toLowerCase();
    else return NextResponse.json({ error: "Missing uid or email" }, { status: 400 });

    await db.collection<UserDocument>("users").updateOne(
      query,
      { $set: { role, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, query, role });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update user role" }, { status: 500 });
  }
}

// DELETE: Delete / remove user or dev
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    const { db } = await connectToDatabase();
    const query: any = {};

    if (id) query._id = new ObjectId(id);
    else if (uid) query.uid = uid;
    else if (email) query.email = email.trim().toLowerCase();
    else return NextResponse.json({ error: "Missing id, uid, or email parameter" }, { status: 400 });

    await db.collection<UserDocument>("users").deleteOne(query);
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete user" }, { status: 500 });
  }
}
