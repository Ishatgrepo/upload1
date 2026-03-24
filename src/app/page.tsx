import Uploader from "@/components/Uploader";
import { Cloud, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold tracking-wide uppercase">
            <Cloud className="w-4 h-4" />
            Next Generation Storage
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            Premium Personal <span className="text-blue-600">Cloud.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Experience blazing-fast uploads and secure storage with our
            minimalist file uploader. Simple, fast, and permanent.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: Zap, title: "Blazing Fast", desc: "Optimized chunked uploads for speed." },
            { icon: Shield, title: "Secure", desc: "End-to-end encryption for your data." },
            { icon: Cloud, title: "Unlimited", desc: "Store files of any size with ease." },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-slate-500 text-sm mt-2">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Uploader Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400/5 blur-3xl rounded-full -z-10" />
          <Uploader />
        </div>

        {/* Footer */}
        <footer className="text-center pt-20 border-t border-slate-200">
          <p className="text-slate-400 text-sm">
            &copy; 2024 CloudDrive Inc. Built for performance.
          </p>
        </footer>
      </div>
    </main>
  );
}
