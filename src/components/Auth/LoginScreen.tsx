"use client";

import React, { useState } from "react";
import {
  LogIn,
  Sun,
  Moon,
  Shield,
  Lock,
  Workflow,
  ScrollText
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface LoginScreenProps {
  onLogin: () => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await onLogin();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-app text-primary-theme transition-colors duration-250 relative overflow-hidden font-[Verdana,Geneva,sans-serif]">
      {/* Background Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#f06a55]/15 dark:bg-[#f06a55]/10 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#f06a55] flex items-center justify-center shadow-lg shadow-[#f06a55]/30 text-white font-black text-sm tracking-tight">
            PW
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-primary-theme leading-tight">
              Physics Wallah
            </h1>
            <p className="text-[10px] text-[#f06a55] font-bold tracking-wide">
              CENTRAL ANALYTICS ENGINE
            </p>
          </div>
        </div>

        {/* Global Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 btn-secondary-theme rounded-xl transition-all shadow-xs flex items-center justify-center"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-[#f06a55]" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          )}
        </button>
      </header>

      {/* Main Login Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md p-8 sm:p-10 space-y-6 text-center pw-card shadow-2xl transition-colors duration-250">
          {/* Security Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f06a55]/10 text-[#f06a55] text-xs font-bold uppercase tracking-wide border border-[#f06a55]/20">
            <Shield className="w-3.5 h-3.5" />
            Restricted Enterprise Access
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-theme tracking-tight">
              Sign In to Analytics
            </h2>
            <p className="text-xs sm:text-sm text-secondary-theme leading-relaxed font-normal">
              Sign in with your authorized Google Account to manage DAG workflows, trigger WhatsApp dispatches, and inspect audit logs.
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="pt-2">
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-5 rounded-2xl btn-coral active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="pt-4 border-t border-theme grid grid-cols-2 gap-2.5 text-left">
            <div className="p-3 rounded-xl bg-app border border-theme space-y-0.5">
              <p className="font-bold text-xs text-primary-theme flex items-center gap-1">
                <Workflow className="w-3.5 h-3.5 text-[#f06a55]" /> Google Sheet DAGs
              </p>
              <p className="text-[10px] text-muted-theme">Automated triggers</p>
            </div>

            <div className="p-3 rounded-xl bg-app border border-theme space-y-0.5">
              <p className="font-bold text-xs text-primary-theme flex items-center gap-1">
                <ScrollText className="w-3.5 h-3.5 text-emerald-500" /> Audit Logs
              </p>
              <p className="text-[10px] text-muted-theme">Cloudinary PDF links</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-muted-theme z-10">
        © {new Date().getFullYear()} Physics Wallah Central Analytics • Powered by Serverless Vercel Engine
      </footer>
    </div>
  );
}
