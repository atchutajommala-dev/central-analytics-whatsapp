import { NextResponse } from "next/server";
import { connectToDatabase, UserDocument } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL } = body;

    const userEmailLower = email.trim().toLowerCase();

    // Enforce strict @pw.live organizational domain authorization
    if (!userEmailLower.endsWith("@pw.live")) {
      return NextResponse.json(
        { error: "Access Denied: Only @pw.live organizational email addresses are authorized to sign in." },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<UserDocument>("users");

    // Check ADMIN_EMAILS env variable
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isEnvAdmin = adminEmails.includes(userEmailLower);

    // Check if user exists by UID or Email (pre-added by admin)
    let existingUser = await usersCollection.findOne({
      $or: [{ uid }, { email: userEmailLower }]
    });

    if (!existingUser) {
      const totalUsers = await usersCollection.countDocuments();
      let initialRole: "admin" | "dev" | "viewer" = "viewer";

      if (isEnvAdmin || totalUsers === 0) {
        initialRole = "admin";
      }

      const newUser: UserDocument = {
        uid,
        email: userEmailLower,
        displayName: displayName || "",
        photoURL: photoURL || "",
        role: initialRole,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await usersCollection.insertOne(newUser);
      existingUser = newUser as any;
    } else {
      // Update existing user details and sync UID if it was pre-registered by email
      const targetRole = isEnvAdmin ? "admin" : existingUser.role;

      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            uid,
            email: userEmailLower,
            displayName: displayName || existingUser.displayName,
            photoURL: photoURL || existingUser.photoURL,
            role: targetRole,
            lastLoginAt: new Date(),
          },
        }
      );
      existingUser.role = targetRole;
      existingUser.lastLoginAt = new Date();
    }

    return NextResponse.json({ user: existingUser });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Auth sync failed" }, { status: 500 });
  }
}
