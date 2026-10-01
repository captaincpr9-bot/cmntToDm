"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Zap, Link as LinkIcon, Users, 
  BarChart3, ShieldCheck, ArrowRight, CheckCircle2, 
  ChevronDown, Menu, X, Terminal, MessageCircle as Instagram
} from "lucide-react";
import { HowItWorksScroll } from "./how-it-works-scroll";

const FEATURES_DATA = [
  {
    id: "01",
    title: "Keyword Triggers",
    tag: "Sub-second",
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
    desc: "Define exact match, fuzzy spelling variations, and multi-keyword logic matrices across all media types.",
    detail: "Supports regex, comma-separated synonyms, and case-insensitive matching with zero false positives.",
  },
  {
    id: "02",
    title: "Follow Gate",
    tag: "Growth",
    icon: <Users className="w-5 h-5 text-purple-400" />,
    desc: "Require users to follow your account before the automated DM link is dispatched.",
    detail: "Converts passive scrollers into dedicated followers automatically via webhook detection.",
  },
  {
    id: "03",
    title: "Tracked Links & UTM",
    tag: "Analytics",
    icon: <LinkIcon className="w-5 h-5 text-blue-400" />,
    desc: "Auto-generate short trackable links with granular UTM injection for direct revenue attribution.",
    detail: "Includes custom vanity domains, per-user click telemetry, and device fingerprinting.",
  },
  {
    id: "04",
    title: "Story Replies & Sliders",
    tag: "Engagement",
    icon: <MessageSquare className="w-5 h-5 text-pink-400" />,
    desc: "Trigger instant DMs from Instagram Story emoji sliders, quiz taps, or standard quick-reply responses.",
    detail: "Turn transient 24-hour stories into direct conversation funnels instantly.",
  },
  {
    id: "05",
    title: "Multi-Account Sync",
    tag: "Enterprise",
    icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
    desc: "Connect up to 20 creator and agency brand profiles under a single, central dashboard.",
    detail: "Role-based access controls for agencies, aggregated volume analytics, and isolated endpoints.",
  },
  {
    id: "06",
    title: "100% Meta Compliant",
    tag: "Security",
    icon: <ShieldCheck className="w-5 h-5 text-slate-400" />,
    desc: "Official Meta Instagram Graph API integration. No headless browsers or sketchy workarounds.",
    detail: "Strict compliance with Meta's terms of service ensures zero shadowban risk.",
  }
];

const FAQ_DATA = [
  {
    q: "Will this get my Instagram account shadowbanned?",
    a: "No. CmntToDm operates 100% via the official Meta Instagram Graph API. We never use headless browser automation or unauthorized private endpoints.",
  },
  {
    q: "Does it work on Reels, Posts, and Stories?",
    a: "Yes. The engine listens across all active post formats: Reels, carousels, single images, and Instagram Story replies or interactive slider interactions.",
  },
  {
    q: "What happens if a user is not following me yet?",
    a: "If the Follow-Gate feature is enabled, CmntToDm automatically sends a polite conversational reply asking them to tap follow first, then delivers the link.",
  },
  {
    q: "Can I set multiple keyword variations?",
    a: "Yes. You can configure multi-keyword arrays and enable fuzzy matching so minor typos still trigger the automated response.",
  },
];

export default function CmntToDmLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Active Section ScrollSpy Logic (Bottom-to-Top order)
      const sections = ["faq", "pricing", "features", "how-it-works"];
      let currentSection = "";
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Offset to trigger earlier when scrolling down (60% of viewport)
          if (rect.top <= window.innerHeight * 0.6) {
            currentSection = section;
            break;
          }
        }
      }
      setActiveSection(currentSection);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-black text-slate-300 font-sans min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 transition-all duration-700 pointer-events-none px-4">
        <div 
          className={`pointer-events-auto flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled 
              ? "w-full max-w-5xl bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] px-4 py-2" 
              : "w-full max-w-7xl bg-transparent border-transparent px-2 py-4"
          }`}
        >
          
          {/* Logo */}
          <div className="w-[200px]">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <Zap className="w-5 h-5 text-white relative z-10" />
              </div>
              <span className={`font-bold tracking-tight text-xl transition-all duration-300 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400`}>
                CmntToDm
              </span>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
            {[
              { id: 'how-it-works', label: 'Workflow' },
              { id: 'features', label: 'Features' },
              { id: 'pricing', label: 'Pricing' },
              { id: 'faq', label: 'FAQ' }
            ].map((link) => (
              <a 
                key={link.id}
                href={`#${link.id}`} 
                className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 ${
                  activeSection === link.id 
                    ? 'text-white bg-white/10 shadow-inner scale-105' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="w-[200px] flex items-center justify-end">
            <Link href="/login" className="hidden md:inline-flex h-11 items-center justify-center rounded-full bg-white text-black px-7 text-[13px] font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Start Free
            </Link>
            <button 
              className="md:hidden text-slate-400 hover:text-white bg-white/5 p-3 rounded-full border border-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-[72px] p-6 bg-black/95 backdrop-blur-2xl border-b border-white/10 z-40 md:hidden flex flex-col gap-6"
          >
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white">Workflow</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-white">FAQ</a>
            <div className="h-[1px] w-full bg-white/10" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="h-12 w-full flex items-center justify-center rounded-xl bg-white text-black font-medium text-lg">
              Get Started Free
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Meta Graph API v19.0 Integrated
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tighter leading-[1.1] max-w-4xl"
            >
              Turn <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Comments</span> into Sales automatically.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed"
            >
              Someone comments a keyword. They get your link in their DMs in sub-second speed. Zero friction. 100% automated delivery.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
            >
              <Link href="/login" className="h-12 px-8 rounded-full bg-white text-black font-medium flex items-center gap-2 hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] w-full sm:w-auto justify-center">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="h-12 px-8 rounded-full bg-white/5 border border-white/10 text-white font-medium flex items-center justify-center hover:bg-white/10 transition-colors w-full sm:w-auto backdrop-blur-sm">
                View Documentation
              </a>
            </motion.div>
          </div>

          {/* Hero Image/Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 max-w-5xl mx-auto px-6 relative"
          >
            <div className="rounded-2xl border border-white/10 bg-black/50 p-2 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
              <div className="rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0a] flex flex-col md:flex-row">
                
                {/* Simulated Instagram Interface */}
                <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <Instagram className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Instagram Post</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xs text-indigo-300 font-medium">U1</span>
                      </div>
                      <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/5">
                        <p className="text-sm text-slate-300"><span className="font-semibold text-white">@user</span> Can I get the guide?</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pl-8">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-purple-300 font-medium">ME</span>
                      </div>
                      <div className="bg-indigo-500/10 rounded-2xl rounded-tl-none p-3 border border-indigo-500/20">
                        <p className="text-sm text-indigo-200">Just sent it to your DMs! 🚀</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Terminal/Logs */}
                <div className="w-full md:w-1/2 p-6 font-mono text-xs bg-black/80 text-slate-400">
                  <div className="flex items-center gap-2 mb-4 text-slate-500">
                    <Terminal className="w-4 h-4" />
                    <span>engine_logs.tail</span>
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-emerald-400">✓ [14:02:01]</span> Webhook received: comment.created</p>
                    <p><span className="text-blue-400">ℹ [14:02:01]</span> Analyzing text: "Can I get the guide?"</p>
                    <p><span className="text-blue-400">ℹ [14:02:01]</span> Keyword match found: 'guide'</p>
                    <p><span className="text-emerald-400">✓ [14:02:02]</span> Executing action: send_dm</p>
                    <p><span className="text-purple-400">✦ [14:02:02]</span> Message dispatched successfully. Latency: 0.8s</p>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </section>

        {/* LOGOS */}
        <section className="py-10 border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
            <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-widest">Powered by official APIs</p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale">
              <span className="text-xl font-bold tracking-tighter">META</span>
              <span className="text-xl font-bold tracking-tighter">INSTAGRAM</span>
              <span className="text-xl font-bold tracking-tighter">GRAPH API</span>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <HowItWorksScroll />

        {/* FEATURES */}
        <section id="features" className="py-24 md:py-32 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">Engineered for conversion.</h2>
              <p className="text-lg text-slate-400">Six hardware-grade automation capabilities designed to maximize your funnel without risking your account.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES_DATA.map((feat) => (
                <div key={feat.id} className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all hover:border-white/10 flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feat.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{feat.desc}</p>
                  <div className="pt-6 border-t border-white/5 mt-auto">
                    <p className="text-xs text-slate-500 font-medium">{feat.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 md:py-32 bg-black relative border-t border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">Simple, transparent pricing.</h2>
              <p className="text-lg text-slate-400">No hidden per-message penalties. Start for free, upgrade when you scale.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              
              {/* Starter */}
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 100 Automated DMs</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 1 Instagram Account</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Standard tracking</li>
                </ul>
                <Link href="/login" className="h-12 w-full flex items-center justify-center rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10">
                  Start Free
                </Link>
              </div>

              {/* Pro */}
              <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/30 flex flex-col relative scale-105 shadow-2xl shadow-indigo-500/10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-500 rounded-full text-xs font-semibold text-white">
                  Most Popular
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">$39</span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-white font-medium"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Unlimited DMs</li>
                  <li className="flex items-center gap-3 text-sm text-white font-medium"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Unlimited Keywords</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 3 Instagram Accounts</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Follow-Gate Protection</li>
                </ul>
                <Link href="/login" className="h-12 w-full flex items-center justify-center rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  Upgrade to Pro
                </Link>
              </div>

              {/* Studio */}
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-2">Studio</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">$119</span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Unlimited DMs</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 15 Instagram Accounts</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> White-label analytics</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Team Inbox seats</li>
                </ul>
                <Link href="/login" className="h-12 w-full flex items-center justify-center rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10">
                  Contact Sales
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 md:py-32 border-t border-white/5 relative">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-12 text-center">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQ_DATA.map((faq, idx) => (
                <div key={idx} className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-medium text-white">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === idx && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-5 pt-0 text-slate-400 text-sm leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 md:py-32 relative overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-950/20" />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">Stop replying manually.</h2>
            <p className="text-xl text-slate-400 mb-10">Join thousands of creators automating their direct message funnels today.</p>
            <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full bg-white text-black px-8 text-lg font-medium hover:bg-slate-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-white tracking-tight">CmntToDm</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 CmntToDm Engine. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
